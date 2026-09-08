import { awardSignupGift } from './lib/brk/wallet-service';

async function main() {
    console.log('Running awardSignupGift for 1461...');
    const result = await awardSignupGift(1461);
    console.log(result);
}

main().catch(console.error).finally(() => process.exit(0));
