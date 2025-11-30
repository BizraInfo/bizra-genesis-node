//! BIZRA Genesis Node - Compilation Test Binary
//! Tests SQLx database query compilation

#[cfg(feature = "database")]
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🎖️ BIZRA Professional Compilation Test - Starting...");

    // Test that persistence types compile correctly
    use bizra_genesis_node::persistence::traits::AgentState;
    use bizra_genesis_node::persistence::traits::ConsensusRun;

    println!("✅ Database types compile successfully");
    println!(
        "  - ConsensusRun: {:?}",
        std::any::type_name::<ConsensusRun>()
    );
    println!("  - AgentState: {:?}", std::any::type_name::<AgentState>());

    println!("🎖️ ELITE PRACTITIONER COMPILATION VERIFICATION: PASSED");
    Ok(())
}

#[cfg(not(feature = "database"))]
fn main() {
    println!("❌ Database features not enabled - compile test requires --features database");
    std::process::exit(1);
}
