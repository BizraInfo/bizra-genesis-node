// synthesis_orchestrator/src/performance.rs
// Performance optimizations for production workloads

use bytes::BytesMut;
use std::sync::Arc;
use tokio::sync::Mutex;

/// High-performance buffer pool for zero-copy operations
///
/// Provides reusable BytesMut buffers to reduce allocations in hot paths.
/// Thread-safe via async Mutex for use in tokio runtime.
///
/// # Examples
/// ```no_run
/// use synthesis_orchestrator::performance::BufferPool;
///
/// # tokio_test::block_on(async {
/// let pool = BufferPool::new(10, 4096);
/// let buffer = pool.acquire().await;
/// // Use buffer...
/// pool.release(buffer).await;
/// # });
/// ```
pub struct BufferPool {
    pool: Arc<Mutex<Vec<BytesMut>>>,
    buffer_size: usize,
}

impl BufferPool {
    pub fn new(initial: usize, size: usize) -> Self {
        let mut pool = Vec::with_capacity(initial);
        for _ in 0..initial {
            pool.push(BytesMut::with_capacity(size));
        }

        Self {
            pool: Arc::new(Mutex::new(pool)),
            buffer_size: size,
        }
    }

    pub async fn acquire(&self) -> BytesMut {
        let mut pool = self.pool.lock().await;
        pool.pop()
            .unwrap_or_else(|| BytesMut::with_capacity(self.buffer_size))
    }

    pub async fn release(&self, mut buffer: BytesMut) {
        buffer.clear();
        let mut pool = self.pool.lock().await;
        if pool.len() < 100 {
            pool.push(buffer);
        }
    }

    /// Get current pool size (for testing/monitoring)
    pub async fn size(&self) -> usize {
        self.pool.lock().await.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_buffer_pool_creation() {
        let pool = BufferPool::new(5, 1024);
        assert_eq!(pool.buffer_size, 1024);
        assert_eq!(pool.size().await, 5);
    }

    #[tokio::test]
    async fn test_buffer_pool_acquire() {
        let pool = BufferPool::new(3, 2048);
        let initial_size = pool.size().await;

        let buffer = pool.acquire().await;
        assert_eq!(buffer.capacity(), 2048);
        assert_eq!(pool.size().await, initial_size - 1);
    }

    #[tokio::test]
    async fn test_buffer_pool_acquire_when_empty() {
        let pool = BufferPool::new(0, 512);
        assert_eq!(pool.size().await, 0);

        // Should create new buffer when pool empty
        let buffer = pool.acquire().await;
        assert_eq!(buffer.capacity(), 512);
        assert_eq!(pool.size().await, 0);
    }

    #[tokio::test]
    async fn test_buffer_pool_release() {
        let pool = BufferPool::new(2, 1024);

        let mut buffer = pool.acquire().await;
        buffer.extend_from_slice(b"test data");
        assert!(!buffer.is_empty());

        let size_before = pool.size().await;
        pool.release(buffer).await;

        // Buffer should be returned and cleared
        assert_eq!(pool.size().await, size_before + 1);

        // Acquire again - should get cleared buffer
        let reused = pool.acquire().await;
        assert_eq!(reused.len(), 0);
    }

    #[tokio::test]
    async fn test_buffer_pool_max_size_limit() {
        let pool = BufferPool::new(0, 256);

        // Add buffers up to limit (100)
        for _ in 0..110 {
            let buffer = BytesMut::with_capacity(256);
            pool.release(buffer).await;
        }

        // Should not exceed 100 buffers
        assert_eq!(pool.size().await, 100);
    }

    #[tokio::test]
    async fn test_buffer_pool_concurrent_access() {
        let pool = Arc::new(BufferPool::new(10, 512));
        let mut handles = vec![];

        // Spawn 20 concurrent tasks
        for i in 0..20 {
            let pool_clone = Arc::clone(&pool);
            let handle = tokio::spawn(async move {
                let mut buffer = pool_clone.acquire().await;
                buffer.extend_from_slice(&[i as u8; 100]);
                tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
                pool_clone.release(buffer).await;
            });
            handles.push(handle);
        }

        // Wait for all tasks
        for handle in handles {
            handle.await.unwrap();
        }

        // Pool should be functional after concurrent access
        let final_size = pool.size().await;
        assert!(final_size <= 100);
    }

    #[tokio::test]
    async fn test_buffer_pool_reuse() {
        let pool = BufferPool::new(1, 1024);

        // Acquire and release multiple times
        for i in 0..5 {
            let mut buffer = pool.acquire().await;
            buffer.extend_from_slice(&vec![i; 100]);
            assert!(!buffer.is_empty());
            pool.release(buffer).await;
        }

        // Pool should still have 1 buffer
        assert_eq!(pool.size().await, 1);
    }

    #[tokio::test]
    async fn test_buffer_pool_capacity_preserved() {
        let pool = BufferPool::new(1, 4096);

        let buffer1 = pool.acquire().await;
        assert_eq!(buffer1.capacity(), 4096);
        pool.release(buffer1).await;

        let buffer2 = pool.acquire().await;
        assert_eq!(buffer2.capacity(), 4096);
    }
}
