#!/usr/bin/env node
// Mycelia Launch Controller CLI - Launch day management and control

import { LaunchController } from './index.js';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: mycelia-launchctl <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  t-minus --days <14|7|1>    Show T-minus checklist');
    console.log('  go                         Run go/no-go gate verification');
    console.log('  pause redemption           Pause BTC mainnet redemption');
    console.log('  resume redemption          Resume BTC mainnet redemption');
    console.log('  slow rewards               Enable rewards slow mode');
    console.log('  cap oracle <limit>         Cap Oracle read scope');
    console.log('  drill week1                Run week one chaos drill');
    console.log('  status                     Show launch status summary');
    console.log('');
    console.log('Examples:');
    console.log('  mycelia-launchctl t-minus --days 7');
    console.log('  mycelia-launchctl go');
    console.log('  mycelia-launchctl pause redemption');
    process.exit(1);
  }

  const command = args[0];
  const controller = new LaunchController();
  
  try {
    if (command === 't-minus') {
      await handleTMinus(args.slice(1), controller);
    } else if (command === 'go') {
      await handleGo(controller);
    } else if (command === 'pause' && args[1] === 'redemption') {
      await handlePauseRedemption(controller);
    } else if (command === 'resume' && args[1] === 'redemption') {
      await handleResumeRedemption(controller);
    } else if (command === 'slow' && args[1] === 'rewards') {
      await handleSlowRewards(controller);
    } else if (command === 'cap' && args[1] === 'oracle') {
      await handleCapOracle(args.slice(2), controller);
    } else if (command === 'drill' && args[1] === 'week1') {
      await handleWeekOneDrill(controller);
    } else if (command === 'status') {
      await handleStatus(controller);
    } else {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

async function handleTMinus(args: string[], controller: LaunchController) {
  const daysIndex = args.indexOf('--days');
  if (daysIndex === -1 || daysIndex === args.length - 1) {
    console.error('Error: --days option requires a value (14, 7, or 1)');
    process.exit(1);
  }

  const days = parseInt(args[daysIndex + 1]);
  if (![14, 7, 1].includes(days)) {
    console.error('Error: --days must be 14, 7, or 1');
    process.exit(1);
  }

  const checklist = controller.getTMinusChecklist(days);
  
  console.log(`\n🚀 T-Minus ${days} Days Checklist\n${'='.repeat(30)}`);
  
  for (const item of checklist) {
    const status = item.completed ? '✅' : '⏳';
    const critical = item.critical ? ' 🔴' : '';
    console.log(`${status} ${item.title}${critical}`);
    console.log(`   ${item.description}\n`);
  }
  
  const completed = checklist.filter(item => item.completed).length;
  const total = checklist.length;
  const critical = checklist.filter(item => item.critical && !item.completed).length;
  
  console.log(`Progress: ${completed}/${total} completed`);
  if (critical > 0) {
    console.log(`⚠️  ${critical} critical items remaining`);
  }
}

async function handleGo(controller: LaunchController) {
  console.log('🔍 Running go/no-go gate verification...\n');
  
  const result = await controller.runGoGate();
  
  console.log('Verification Results:');
  console.log('====================');
  
  for (const check of result.checks) {
    const status = check.passed ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    if (check.message) {
      console.log(`   ${check.message}`);
    }
    console.log('');
  }
  
  console.log(result.summary);
  
  if (!result.success) {
    process.exit(1);
  }
}

async function handlePauseRedemption(controller: LaunchController) {
  console.log('⏸️  Pausing BTC mainnet redemption...');
  
  const result = await controller.pauseRedemption();
  
  if (result.success) {
    console.log('✅ Redemption paused successfully');
    console.log(`🚩 Flag status: ${result.flagStatus ? 'enabled' : 'disabled'}`);
  } else {
    console.error('❌ Failed to pause redemption');
    console.error(`   ${result.message}`);
    process.exit(1);
  }
}

async function handleResumeRedemption(controller: LaunchController) {
  console.log('▶️  Resuming BTC mainnet redemption...');
  
  const result = await controller.resumeRedemption();
  
  if (result.success) {
    console.log('✅ Redemption resumed successfully');
    console.log(`🚩 Flag status: ${result.flagStatus ? 'enabled' : 'disabled'}`);
  } else {
    console.error('❌ Failed to resume redemption');
    console.error(`   ${result.message}`);
    process.exit(1);
  }
}

async function handleSlowRewards(controller: LaunchController) {
  console.log('🐌 Enabling rewards slow mode...');
  
  const result = await controller.slowRewards();
  
  if (result.success) {
    console.log('✅ Rewards slow mode enabled successfully');
    console.log(`🚩 Flag status: ${result.flagStatus ? 'enabled' : 'disabled'}`);
  } else {
    console.error('❌ Failed to enable slow rewards');
    console.error(`   ${result.message}`);
    process.exit(1);
  }
}

async function handleCapOracle(args: string[], controller: LaunchController) {
  if (args.length === 0) {
    console.error('Error: cap oracle command requires a limit value');
    process.exit(1);
  }

  const limit = parseInt(args[0]);
  if (isNaN(limit)) {
    console.error('Error: limit must be a number');
    process.exit(1);
  }

  console.log(`🔒 Capping Oracle read scope at ${limit}...`);
  
  const result = await controller.capOracle(limit);
  
  if (result.success) {
    console.log('✅ Oracle read scope capped successfully');
    console.log(`🚩 Flag status: ${result.flagStatus ? 'enabled' : 'disabled'}`);
  } else {
    console.error('❌ Failed to cap Oracle');
    console.error(`   ${result.message}`);
    process.exit(1);
  }
}

async function handleWeekOneDrill(controller: LaunchController) {
  console.log('🔥 Running Week One Chaos Drill...\n');
  
  const result = await controller.runWeekOneDrill();
  
  console.log('Drill Results:');
  console.log('==============');
  
  for (const step of result.steps) {
    const status = step.passed ? '✅' : '❌';
    console.log(`${status} ${step.name}`);
    console.log(`   ${step.message}`);
    console.log('');
  }
  
  console.log(`Summary: ${result.steps.filter(s => s.passed).length}/${result.steps.length} steps passed`);
  console.log(`Peg Invariant: ${result.success ? '✅ MAINTAINED' : '❌ VIOLATED'}`);
  
  // Save drill report
  const fs = await import('fs/promises');
  const reportPath = `./drill-reports/week1-${Date.now()}.json`;
  await fs.mkdir('./drill-reports', { recursive: true });
  await fs.writeFile(reportPath, result.report, 'utf8');
  
  console.log(`\n📋 Drill report saved to: ${reportPath}`);
  
  if (!result.success) {
    console.log('\n❌ Drill failed - investigate issues before proceeding');
    process.exit(1);
  } else {
    console.log('\n✅ Drill completed successfully - all invariants maintained');
  }
}

async function handleStatus(controller: LaunchController) {
  const status = controller.getLaunchStatus();
  
  console.log('\n🚀 Launch Status Summary');
  console.log('========================');
  console.log(`Days until launch: ${status.daysUntilLaunch}`);
  console.log(`Checklist progress: ${(status.checklistProgress * 100).toFixed(0)}%`);
  console.log(`Critical items remaining: ${status.criticalItemsRemaining}`);
  
  const statusEmoji = {
    'ready': '✅',
    'not-ready': '⏳',
    'blocked': '❌'
  };
  
  console.log(`Overall status: ${statusEmoji[status.overallStatus]} ${status.overallStatus.toUpperCase()}`);
  
  if (status.overallStatus === 'blocked') {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
