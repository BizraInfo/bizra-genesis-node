import { renderHook, act } from '@testing-library/react';
import {
  useBizraStore,
  selectPhase,
  selectMetrics,
  selectIsDevMode,
  selectCameraPosition,
} from '../useBizraStore';

describe('useBizraStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useBizraStore.setState({
      phase: 'VOID',
      isDevMode: false,
      isLoading: true,
      audioEnabled: false,
      metrics: {
        poi: 220181.94,
        ihsan: 0.88,
        hours: 0,
        commits: 2847,
        testsPass: 343,
        testsFail: 0,
        coverage: 0.70,
      },
      cameraTarget: [0, 0, 0],
      cameraPosition: [0, 10, 25],
    });
  });

  describe('Phase Management', () => {
    it('should start with VOID phase', () => {
      const { result } = renderHook(() => useBizraStore());
      expect(result.current.phase).toBe('VOID');
    });

    it('should set phase correctly', () => {
      const { result } = renderHook(() => useBizraStore());

      act(() => {
        result.current.setPhase('GENESIS');
      });

      expect(result.current.phase).toBe('GENESIS');
      expect(result.current.cameraPosition).toEqual([0, 15, 30]);
    });

    it('should progress through phases with nextPhase', () => {
      const { result } = renderHook(() => useBizraStore());

      act(() => result.current.nextPhase());
      expect(result.current.phase).toBe('GENESIS');

      act(() => result.current.nextPhase());
      expect(result.current.phase).toBe('CITADEL');

      act(() => result.current.nextPhase());
      expect(result.current.phase).toBe('FLIGHT');
    });

    it('should cycle back to first phase after last', () => {
      const { result } = renderHook(() => useBizraStore());

      // Go to last phase
      act(() => result.current.setPhase('FLIGHT'));
      expect(result.current.phase).toBe('FLIGHT');

      // Next should cycle back
      act(() => result.current.nextPhase());
      expect(result.current.phase).toBe('VOID');
    });
  });

  describe('Camera Management', () => {
    it('should set camera target', () => {
      const { result } = renderHook(() => useBizraStore());

      const newTarget: [number, number, number] = [1, 2, 3];
      act(() => result.current.setCameraTarget(newTarget));

      expect(result.current.cameraTarget).toEqual(newTarget);
    });

    it('should set camera position', () => {
      const { result } = renderHook(() => useBizraStore());

      const newPosition: [number, number, number] = [5, 10, 15];
      act(() => result.current.setCameraPosition(newPosition));

      expect(result.current.cameraPosition).toEqual(newPosition);
    });

    it('should update camera position when phase changes', () => {
      const { result } = renderHook(() => useBizraStore());

      act(() => result.current.setPhase('CITADEL'));
      expect(result.current.cameraPosition).toEqual([0, 20, 40]);
    });
  });

  describe('Toggle Functionality', () => {
    it('should toggle dev mode', () => {
      const { result } = renderHook(() => useBizraStore());

      expect(result.current.isDevMode).toBe(false);

      act(() => result.current.toggleDevMode());
      expect(result.current.isDevMode).toBe(true);

      act(() => result.current.toggleDevMode());
      expect(result.current.isDevMode).toBe(false);
    });

    it('should toggle audio', () => {
      const { result } = renderHook(() => useBizraStore());

      expect(result.current.audioEnabled).toBe(false);

      act(() => result.current.toggleAudio());
      expect(result.current.audioEnabled).toBe(true);
    });
  });

  describe('Loading State', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useBizraStore());

      act(() => result.current.setLoading(false));
      expect(result.current.isLoading).toBe(false);

      act(() => result.current.setLoading(true));
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Metrics Management', () => {
    it('should have correct initial metrics', () => {
      const { result } = renderHook(() => useBizraStore());

      expect(result.current.metrics.poi).toBe(220181.94);
      expect(result.current.metrics.ihsan).toBe(0.88);
      expect(result.current.metrics.commits).toBe(2847);
      expect(result.current.metrics.testsPass).toBe(343);
      expect(result.current.metrics.coverage).toBe(0.70);
    });

    it('should update metrics partially', () => {
      const { result } = renderHook(() => useBizraStore());

      act(() => result.current.updateMetrics({
        poi: 300000,
        testsPass: 400,
      }));

      expect(result.current.metrics.poi).toBe(300000);
      expect(result.current.metrics.testsPass).toBe(400);
      // Other metrics should remain unchanged
      expect(result.current.metrics.commits).toBe(2847);
    });

    it('should add impact to POI score', () => {
      const { result } = renderHook(() => useBizraStore());

      const initialPoi = result.current.metrics.poi;

      act(() => result.current.addImpact(1000));
      expect(result.current.metrics.poi).toBe(initialPoi + 1000);

      act(() => result.current.addImpact(500));
      expect(result.current.metrics.poi).toBe(initialPoi + 1500);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useBizraStore());

      // Make some changes
      act(() => result.current.setPhase('CITADEL'));
      act(() => result.current.updateMetrics({ poi: 400000 }));
      act(() => result.current.toggleDevMode());
      act(() => result.current.setCameraPosition([10, 20, 30]));

      // Reset
      act(() => result.current.reset());

      // Should be back to initial state
      expect(result.current.phase).toBe('VOID');
      expect(result.current.metrics.poi).toBe(220181.94);
      expect(result.current.isDevMode).toBe(false);
      expect(result.current.cameraPosition).toEqual([0, 10, 25]);
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Selectors', () => {
    it('should select phase correctly', () => {
      const store = useBizraStore.getState();
      expect(selectPhase(store)).toBe('VOID');
    });

    it('should select metrics correctly', () => {
      const store = useBizraStore.getState();
      const metrics = selectMetrics(store);
      expect(metrics.poi).toBe(220181.94);
      expect(metrics.ihsan).toBe(0.88);
    });

    it('should select dev mode correctly', () => {
      let store = useBizraStore.getState();
      expect(selectIsDevMode(store)).toBe(false);

      useBizraStore.setState({ isDevMode: true });
      store = useBizraStore.getState();
      expect(selectIsDevMode(store)).toBe(true);
    });

    it('should select camera position correctly', () => {
      const store = useBizraStore.getState();
      expect(selectCameraPosition(store)).toEqual([0, 10, 25]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative impact values', () => {
      const { result } = renderHook(() => useBizraStore());

      const initialPoi = result.current.metrics.poi;

      act(() => result.current.addImpact(-1000));
      expect(result.current.metrics.poi).toBe(initialPoi - 1000);
    });

    it('should handle zero impact values', () => {
      const { result } = renderHook(() => useBizraStore());

      const initialPoi = result.current.metrics.poi;

      act(() => result.current.addImpact(0));
      expect(result.current.metrics.poi).toBe(initialPoi);
    });

    it('should handle metrics with decimal values', () => {
      const { result } = renderHook(() => useBizraStore());

      act(() => result.current.updateMetrics({
        ihsan: 0.995,
        coverage: 0.856,
      }));

      expect(result.current.metrics.ihsan).toBe(0.995);
      expect(result.current.metrics.coverage).toBe(0.856);
    });

    it('should maintain camera target consistency', () => {
      const { result } = renderHook(() => useBizraStore());

      const target1: [number, number, number] = [1, 2, 3];
      const target2: [number, number, number] = [-5, 10, 0.5];

      act(() => result.current.setCameraTarget(target1));
      expect(result.current.cameraTarget).toEqual(target1);

      act(() => result.current.setCameraTarget(target2));
      expect(result.current.cameraTarget).toEqual(target2);
    });

    it('should handle multiple metric updates', () => {
      const { result } = renderHook(() => useBizraStore());

      act(() => result.current.updateMetrics({
        hours: 100,
        testsFail: 5,
      }));

      expect(result.current.metrics.hours).toBe(100);
      expect(result.current.metrics.testsFail).toBe(5);

      act(() => result.current.updateMetrics({
        hours: 200,
        coverage: 0.95,
        testsPass: 500,
      }));

      expect(result.current.metrics.hours).toBe(200);
      expect(result.current.metrics.coverage).toBe(0.95);
      expect(result.current.metrics.testsPass).toBe(500);
      expect(result.current.metrics.testsFail).toBe(5); // Should remain unchanged
    });
  });

  describe('State Immutability', () => {
    it('should not mutate previous references', () => {
      const { result } = renderHook(() => useBizraStore());

      const previousMetrics = result.current.metrics;
      const previousCameraPosition = result.current.cameraPosition;

      act(() => result.current.updateMetrics({ poi: 1000000 }));
      act(() => result.current.setCameraPosition([100, 200, 300]));

      // Previous references should not change
      expect(previousMetrics.poi).toBe(220181.94);
      expect(previousCameraPosition).toEqual([0, 10, 25]);

      // Current state should be updated
      expect(result.current.metrics.poi).toBe(1000000);
      expect(result.current.cameraPosition).toEqual([100, 200, 300]);
    });
  });
});
