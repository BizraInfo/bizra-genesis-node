// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - HYPERGRAPH                                         ║
// ║  Knowledge graph with hyperedges for multi-node relationships            ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

//! # HyperGraph
//!
//! A hypergraph extends traditional graphs by allowing edges (hyperedges) to
//! connect any number of nodes, not just pairs. This enables modeling complex
//! relationships like:
//!
//! - "User X contributed to Project Y using Tool Z"
//! - "Concept A relates to B through C in context D"
//!
//! ## Key Features
//!
//! - **Hyperedges**: Connect multiple nodes with typed relationships
//! - **Node Types**: Categorize nodes (Entity, Concept, Document, etc.)
//! - **Weights**: Edge weights for relevance scoring
//! - **Traversal**: Efficient graph traversal algorithms

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

/// Unique identifier for nodes
pub type NodeId = Uuid;

/// Unique identifier for hyperedges
pub type EdgeId = Uuid;

/// Configuration for HyperGraph
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HyperGraphConfig {
    /// Maximum nodes in the graph
    pub max_nodes: usize,
    /// Maximum edges in the graph
    pub max_edges: usize,
    /// Enable edge weight decay over time
    pub enable_decay: bool,
    /// Decay rate (0.0 - 1.0)
    pub decay_rate: f64,
    /// Minimum edge weight before pruning
    pub min_weight: f64,
}

impl Default for HyperGraphConfig {
    fn default() -> Self {
        Self {
            max_nodes: 1_000_000,
            max_edges: 10_000_000,
            enable_decay: true,
            decay_rate: 0.01,
            min_weight: 0.1,
        }
    }
}

/// Types of nodes in the knowledge graph
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum NodeType {
    /// Named entity (person, organization, location)
    Entity,
    /// Abstract concept
    Concept,
    /// Document or text chunk
    Document,
    /// Code snippet or function
    Code,
    /// User or agent
    Agent,
    /// Task or action
    Task,
    /// Event or occurrence
    Event,
    /// Custom type
    Custom,
}

/// Types of relationships between nodes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum RelationType {
    /// General association
    RelatesTo,
    /// Part-of relationship
    PartOf,
    /// Is-a relationship (inheritance)
    IsA,
    /// Causes relationship
    Causes,
    /// Created-by relationship
    CreatedBy,
    /// References relationship
    References,
    /// Similar-to relationship
    SimilarTo,
    /// Depends-on relationship
    DependsOn,
    /// Custom relationship
    Custom,
}

/// A node in the knowledge graph
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeNode {
    /// Unique identifier
    pub id: NodeId,
    /// Node type
    pub node_type: NodeType,
    /// Node label/name
    pub label: String,
    /// Node content/description
    pub content: String,
    /// Vector embedding (for similarity search)
    pub embedding: Option<Vec<f32>>,
    /// Custom metadata
    pub metadata: HashMap<String, serde_json::Value>,
    /// Creation timestamp
    pub created_at: chrono::DateTime<chrono::Utc>,
    /// Last updated timestamp
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl KnowledgeNode {
    /// Create a new knowledge node
    pub fn new(node_type: NodeType, label: impl Into<String>, content: impl Into<String>) -> Self {
        let now = chrono::Utc::now();
        Self {
            id: Uuid::new_v4(),
            node_type,
            label: label.into(),
            content: content.into(),
            embedding: None,
            metadata: HashMap::new(),
            created_at: now,
            updated_at: now,
        }
    }

    /// Create a new entity node
    pub fn entity(label: impl Into<String>, content: impl Into<String>) -> Self {
        Self::new(NodeType::Entity, label, content)
    }

    /// Create a new concept node
    pub fn concept(label: impl Into<String>, content: impl Into<String>) -> Self {
        Self::new(NodeType::Concept, label, content)
    }

    /// Create a new document node
    pub fn document(label: impl Into<String>, content: impl Into<String>) -> Self {
        Self::new(NodeType::Document, label, content)
    }

    /// Set embedding vector
    pub fn with_embedding(mut self, embedding: Vec<f32>) -> Self {
        self.embedding = Some(embedding);
        self
    }

    /// Add metadata
    pub fn with_metadata(mut self, key: impl Into<String>, value: serde_json::Value) -> Self {
        self.metadata.insert(key.into(), value);
        self
    }
}

/// A hyperedge connecting multiple nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HyperEdge {
    /// Unique identifier
    pub id: EdgeId,
    /// Connected node IDs
    pub nodes: Vec<NodeId>,
    /// Relationship type
    pub relation_type: RelationType,
    /// Edge weight (0.0 - 1.0)
    pub weight: f64,
    /// Edge label
    pub label: Option<String>,
    /// Custom metadata
    pub metadata: HashMap<String, serde_json::Value>,
    /// Creation timestamp
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl HyperEdge {
    /// Create a new hyperedge
    pub fn new(nodes: Vec<NodeId>, relation_type: RelationType) -> Self {
        Self {
            id: Uuid::new_v4(),
            nodes,
            relation_type,
            weight: 1.0,
            label: None,
            metadata: HashMap::new(),
            created_at: chrono::Utc::now(),
        }
    }

    /// Create a binary edge (traditional edge)
    pub fn binary(from: NodeId, to: NodeId, relation_type: RelationType) -> Self {
        Self::new(vec![from, to], relation_type)
    }

    /// Set edge weight
    pub fn with_weight(mut self, weight: f64) -> Self {
        self.weight = weight.clamp(0.0, 1.0);
        self
    }

    /// Set edge label
    pub fn with_label(mut self, label: impl Into<String>) -> Self {
        self.label = Some(label.into());
        self
    }

    /// Check if edge contains a node
    pub fn contains(&self, node_id: &NodeId) -> bool {
        self.nodes.contains(node_id)
    }
}

/// The main HyperGraph structure
#[derive(Debug)]
pub struct HyperGraph {
    /// Graph configuration
    config: HyperGraphConfig,
    /// Nodes indexed by ID
    nodes: HashMap<NodeId, KnowledgeNode>,
    /// Edges indexed by ID
    edges: HashMap<EdgeId, HyperEdge>,
    /// Node to edges index (for fast lookup)
    node_edges: HashMap<NodeId, HashSet<EdgeId>>,
    /// Label to nodes index (for search)
    label_index: HashMap<String, HashSet<NodeId>>,
}

impl HyperGraph {
    /// Create a new hypergraph
    pub fn new(config: HyperGraphConfig) -> Self {
        Self {
            config,
            nodes: HashMap::new(),
            edges: HashMap::new(),
            node_edges: HashMap::new(),
            label_index: HashMap::new(),
        }
    }

    /// Create a hypergraph with default configuration
    pub fn default_config() -> Self {
        Self::new(HyperGraphConfig::default())
    }

    /// Add a node to the graph
    pub fn add_node(&mut self, node: KnowledgeNode) -> Result<NodeId, String> {
        if self.nodes.len() >= self.config.max_nodes {
            return Err("Maximum nodes limit reached".to_string());
        }

        let id = node.id;

        // Update label index
        self.label_index
            .entry(node.label.to_lowercase())
            .or_default()
            .insert(id);

        self.node_edges.insert(id, HashSet::new());
        self.nodes.insert(id, node);

        Ok(id)
    }

    /// Get a node by ID
    pub fn get_node(&self, id: &NodeId) -> Option<&KnowledgeNode> {
        self.nodes.get(id)
    }

    /// Get a mutable node by ID
    pub fn get_node_mut(&mut self, id: &NodeId) -> Option<&mut KnowledgeNode> {
        self.nodes.get_mut(id)
    }

    /// Remove a node and all connected edges
    pub fn remove_node(&mut self, id: &NodeId) -> Option<KnowledgeNode> {
        if let Some(node) = self.nodes.remove(id) {
            // Remove from label index
            if let Some(ids) = self.label_index.get_mut(&node.label.to_lowercase()) {
                ids.remove(id);
            }

            // Remove all connected edges
            if let Some(edge_ids) = self.node_edges.remove(id) {
                for edge_id in edge_ids {
                    self.remove_edge(&edge_id);
                }
            }

            Some(node)
        } else {
            None
        }
    }

    /// Add a hyperedge to the graph
    pub fn add_edge(&mut self, edge: HyperEdge) -> Result<EdgeId, String> {
        if self.edges.len() >= self.config.max_edges {
            return Err("Maximum edges limit reached".to_string());
        }

        // Verify all nodes exist
        for node_id in &edge.nodes {
            if !self.nodes.contains_key(node_id) {
                return Err(format!("Node {} not found", node_id));
            }
        }

        let id = edge.id;

        // Update node-edge index
        for node_id in &edge.nodes {
            self.node_edges.entry(*node_id).or_default().insert(id);
        }

        self.edges.insert(id, edge);

        Ok(id)
    }

    /// Get an edge by ID
    pub fn get_edge(&self, id: &EdgeId) -> Option<&HyperEdge> {
        self.edges.get(id)
    }

    /// Remove an edge
    pub fn remove_edge(&mut self, id: &EdgeId) -> Option<HyperEdge> {
        if let Some(edge) = self.edges.remove(id) {
            // Update node-edge index
            for node_id in &edge.nodes {
                if let Some(edge_ids) = self.node_edges.get_mut(node_id) {
                    edge_ids.remove(id);
                }
            }
            Some(edge)
        } else {
            None
        }
    }

    /// Find nodes by label (case-insensitive)
    pub fn find_by_label(&self, label: &str) -> Vec<&KnowledgeNode> {
        self.label_index
            .get(&label.to_lowercase())
            .map(|ids| ids.iter().filter_map(|id| self.nodes.get(id)).collect())
            .unwrap_or_default()
    }

    /// Find nodes by type
    pub fn find_by_type(&self, node_type: NodeType) -> Vec<&KnowledgeNode> {
        self.nodes
            .values()
            .filter(|n| n.node_type == node_type)
            .collect()
    }

    /// Get all edges connected to a node
    pub fn get_edges_for_node(&self, node_id: &NodeId) -> Vec<&HyperEdge> {
        self.node_edges
            .get(node_id)
            .map(|edge_ids| {
                edge_ids
                    .iter()
                    .filter_map(|id| self.edges.get(id))
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Get neighboring nodes (connected via edges)
    pub fn get_neighbors(&self, node_id: &NodeId) -> Vec<&KnowledgeNode> {
        let mut neighbors = HashSet::new();

        if let Some(edge_ids) = self.node_edges.get(node_id) {
            for edge_id in edge_ids {
                if let Some(edge) = self.edges.get(edge_id) {
                    for connected_id in &edge.nodes {
                        if connected_id != node_id {
                            neighbors.insert(*connected_id);
                        }
                    }
                }
            }
        }

        neighbors
            .iter()
            .filter_map(|id| self.nodes.get(id))
            .collect()
    }

    /// Traverse graph from a starting node (BFS)
    pub fn traverse_bfs(&self, start: &NodeId, max_depth: usize) -> Vec<&KnowledgeNode> {
        let mut visited = HashSet::new();
        let mut result = Vec::new();
        let mut queue = vec![(*start, 0)];

        while let Some((current, depth)) = queue.pop() {
            if depth > max_depth || visited.contains(&current) {
                continue;
            }

            visited.insert(current);

            if let Some(node) = self.nodes.get(&current) {
                result.push(node);

                if depth < max_depth {
                    for neighbor in self.get_neighbors(&current) {
                        if !visited.contains(&neighbor.id) {
                            queue.push((neighbor.id, depth + 1));
                        }
                    }
                }
            }
        }

        result
    }

    /// Get graph statistics
    pub fn stats(&self) -> HyperGraphStats {
        HyperGraphStats {
            node_count: self.nodes.len(),
            edge_count: self.edges.len(),
            avg_edges_per_node: if self.nodes.is_empty() {
                0.0
            } else {
                self.edges.len() as f64 / self.nodes.len() as f64
            },
        }
    }

    /// Number of nodes in the graph
    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }

    /// Number of edges in the graph
    pub fn edge_count(&self) -> usize {
        self.edges.len()
    }
}

/// Statistics about the hypergraph
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HyperGraphStats {
    /// Total number of nodes
    pub node_count: usize,
    /// Total number of edges
    pub edge_count: usize,
    /// Average edges per node
    pub avg_edges_per_node: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_hypergraph() {
        let graph = HyperGraph::default_config();
        assert_eq!(graph.node_count(), 0);
        assert_eq!(graph.edge_count(), 0);
    }

    #[test]
    fn test_add_nodes() {
        let mut graph = HyperGraph::default_config();

        let node1 = KnowledgeNode::entity("Alice", "A user");
        let node2 = KnowledgeNode::entity("Bob", "Another user");

        let id1 = graph.add_node(node1).unwrap();
        let id2 = graph.add_node(node2).unwrap();

        assert_eq!(graph.node_count(), 2);
        assert!(graph.get_node(&id1).is_some());
        assert!(graph.get_node(&id2).is_some());
    }

    #[test]
    fn test_add_edge() {
        let mut graph = HyperGraph::default_config();

        let node1 = KnowledgeNode::entity("Alice", "A user");
        let node2 = KnowledgeNode::entity("Bob", "Another user");

        let id1 = graph.add_node(node1).unwrap();
        let id2 = graph.add_node(node2).unwrap();

        let edge = HyperEdge::binary(id1, id2, RelationType::RelatesTo);
        let edge_id = graph.add_edge(edge).unwrap();

        assert_eq!(graph.edge_count(), 1);
        assert!(graph.get_edge(&edge_id).is_some());
    }

    #[test]
    fn test_hyperedge_multiple_nodes() {
        let mut graph = HyperGraph::default_config();

        let node1 = KnowledgeNode::entity("Alice", "User");
        let node2 = KnowledgeNode::concept("Project", "A project");
        let node3 = KnowledgeNode::entity("Tool", "A tool");

        let id1 = graph.add_node(node1).unwrap();
        let id2 = graph.add_node(node2).unwrap();
        let id3 = graph.add_node(node3).unwrap();

        // Create hyperedge: "Alice worked on Project using Tool"
        let edge = HyperEdge::new(vec![id1, id2, id3], RelationType::RelatesTo)
            .with_label("worked on using");

        let edge_id = graph.add_edge(edge).unwrap();
        let edge = graph.get_edge(&edge_id).unwrap();

        assert_eq!(edge.nodes.len(), 3);
        assert!(edge.contains(&id1));
        assert!(edge.contains(&id2));
        assert!(edge.contains(&id3));
    }

    #[test]
    fn test_find_by_label() {
        let mut graph = HyperGraph::default_config();

        let node1 = KnowledgeNode::entity("Alice", "A user");
        let node2 = KnowledgeNode::entity("alice", "Another user with same label");

        graph.add_node(node1).unwrap();
        graph.add_node(node2).unwrap();

        let results = graph.find_by_label("ALICE");
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_get_neighbors() {
        let mut graph = HyperGraph::default_config();

        let node1 = KnowledgeNode::entity("A", "Node A");
        let node2 = KnowledgeNode::entity("B", "Node B");
        let node3 = KnowledgeNode::entity("C", "Node C");

        let id1 = graph.add_node(node1).unwrap();
        let id2 = graph.add_node(node2).unwrap();
        let id3 = graph.add_node(node3).unwrap();

        // A -> B, A -> C
        graph
            .add_edge(HyperEdge::binary(id1, id2, RelationType::RelatesTo))
            .unwrap();
        graph
            .add_edge(HyperEdge::binary(id1, id3, RelationType::RelatesTo))
            .unwrap();

        let neighbors = graph.get_neighbors(&id1);
        assert_eq!(neighbors.len(), 2);
    }

    #[test]
    fn test_traverse_bfs() {
        let mut graph = HyperGraph::default_config();

        let node1 = KnowledgeNode::entity("A", "Node A");
        let node2 = KnowledgeNode::entity("B", "Node B");
        let node3 = KnowledgeNode::entity("C", "Node C");
        let node4 = KnowledgeNode::entity("D", "Node D");

        let id1 = graph.add_node(node1).unwrap();
        let id2 = graph.add_node(node2).unwrap();
        let id3 = graph.add_node(node3).unwrap();
        let id4 = graph.add_node(node4).unwrap();

        // A -> B -> C, A -> D
        graph
            .add_edge(HyperEdge::binary(id1, id2, RelationType::RelatesTo))
            .unwrap();
        graph
            .add_edge(HyperEdge::binary(id2, id3, RelationType::RelatesTo))
            .unwrap();
        graph
            .add_edge(HyperEdge::binary(id1, id4, RelationType::RelatesTo))
            .unwrap();

        let traversed = graph.traverse_bfs(&id1, 1);
        assert_eq!(traversed.len(), 3); // A, B, D (depth 0 and 1)

        let traversed_deep = graph.traverse_bfs(&id1, 2);
        assert_eq!(traversed_deep.len(), 4); // A, B, C, D
    }

    #[test]
    fn test_remove_node() {
        let mut graph = HyperGraph::default_config();

        let node1 = KnowledgeNode::entity("A", "Node A");
        let node2 = KnowledgeNode::entity("B", "Node B");

        let id1 = graph.add_node(node1).unwrap();
        let id2 = graph.add_node(node2).unwrap();

        graph
            .add_edge(HyperEdge::binary(id1, id2, RelationType::RelatesTo))
            .unwrap();

        assert_eq!(graph.node_count(), 2);
        assert_eq!(graph.edge_count(), 1);

        graph.remove_node(&id1);

        assert_eq!(graph.node_count(), 1);
        assert_eq!(graph.edge_count(), 0);
    }
}
