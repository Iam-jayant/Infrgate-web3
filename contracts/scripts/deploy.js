const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

    const network = hre.network.name;
    
    // ── USDT address ─────────────────────────────────────────────────────
    // Must be set in .env. Default to the official BOT Chain Mainnet USDT
    const usdtAddress = process.env.USDT_CONTRACT_ADDRESS || "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C";
    console.log(`Using USDT address: ${usdtAddress} on network: ${network}`);

    // ── Deploy InfrgateSubscription ───────────────────────────────────────
    console.log("\nDeploying InfrgateSubscription...");
    const InfrgateSubscription = await hre.ethers.getContractFactory("InfrgateSubscription");
    const subscription = await InfrgateSubscription.deploy(usdtAddress);
    await subscription.waitForDeployment();

    const contractAddress = await subscription.getAddress();
    console.log("InfrgateSubscription deployed to:", contractAddress);

    // ── Log deployment summary ───────────────────────────────────────────
    console.log("\n════════════════════════════════════════════════════════");
    console.log("  DEPLOYMENT SUMMARY");
    console.log("════════════════════════════════════════════════════════");
    console.log(`  Network:        ${network}`);
    console.log(`  Chain ID:       ${(await hre.ethers.provider.getNetwork()).chainId}`);
    console.log(`  USDT:           ${usdtAddress}`);
    console.log(`  Subscription:   ${contractAddress}`);
    console.log(`  Owner:          ${deployer.address}`);
    console.log("════════════════════════════════════════════════════════");

    // ── Verify on explorer ────────────────────────────────────────────────
    if (network === "botchain" || network === "botchain_testnet") {
        console.log("\nWaiting for block confirmations before verification...");
        // Wait for 5 confirmations
        const tx = subscription.deploymentTransaction();
        if (tx) {
            await tx.wait(5);
        }

        try {
            await hre.run("verify:verify", {
                address: contractAddress,
                constructorArguments: [usdtAddress],
            });
            console.log("Contract verified on explorer!");
        } catch (error) {
            console.log("Verification failed (can be done manually):", error.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
