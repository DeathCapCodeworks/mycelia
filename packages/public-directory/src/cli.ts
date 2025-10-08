import { Command } from 'commander';
import { DirectoryCLI } from './server.js';

const program = new Command();

program
  .name('public-directory')
  .description('CLI for managing the Mycelia Public Directory')
  .version('0.1.0');

program.command('add')
  .description('Add an envelope to the directory')
  .argument('<envelopeCid>', 'Envelope CID to add')
  .action(async (envelopeCid: string) => {
    const cli = new DirectoryCLI();
    await cli.add(envelopeCid);
  });

program.command('remove')
  .description('Remove an envelope from the directory')
  .argument('<envelopeCid>', 'Envelope CID to remove')
  .action(async (envelopeCid: string) => {
    const cli = new DirectoryCLI();
    await cli.remove(envelopeCid);
  });

program.command('list')
  .description('List all envelopes in the directory')
  .action(async () => {
    const cli = new DirectoryCLI();
    await cli.list();
  });

program.command('moderate')
  .description('Moderate an envelope')
  .argument('<envelopeCid>', 'Envelope CID to moderate')
  .argument('<action>', 'Moderation action (hide|show)')
  .argument('<reason>', 'Reason for moderation')
  .action(async (envelopeCid: string, action: string, reason: string) => {
    const cli = new DirectoryCLI();
    await cli.moderate(envelopeCid, action, reason);
  });

program.parse(process.argv);
