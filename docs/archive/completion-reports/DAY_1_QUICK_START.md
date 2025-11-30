# 🚀 DAY 1 QUICK START GUIDE

**Genesis 100 Elite Launch Execution**

## 📋 Pre-Flight Checklist (09:00 - 09:30)

1. **Verify Environment**

    ```powershell
    cd c:\bizra-genesis-node
    .\scripts\genesis-100-smoke-test.ps1 -ApiBase "http://localhost:3000"
    ```

2. **Configure Support Bot**

    ```powershell
    cd support-bot
    cp .env.example .env
    # Add Discord Token and Channel ID
    ```

## 🟢 Launch Sequence (09:30 - 11:00)

1. **Start Backend (Terminal 1)**

    ```powershell
    cd c:\bizra-genesis-node
    cargo run --release --bin api_server
    ```

2. **Deploy Frontend (Terminal 2)**

    ```powershell
    cd c:\bizra-genesis-node\apps\dashboard
    npm run dev 
    # OR for production:
    # vercel --prod
    ```

3. **Start Support Bot (Terminal 3)**

    ```powershell
    cd c:\bizra-genesis-node\support-bot
    npm start
    ```

## 📨 Invitation Protocol (11:00 - 12:00)

**Template for First 10 Users:**

> "Welcome to Genesis 100. You have been selected for the Day 1 Elite Cohort.
>
> Access: <https://genesis.bizra.io> (or localhost for testing)
>
> This is a 'Professional Elite' grade system. We value radical transparency.
> Please report any issues directly to the #genesis-support channel.
>
> Enjoy the power of the Hivemind."

## 🛡️ Monitoring & Support (12:00 - 14:00)

- **Office Hours:** 7-9 PM Dubai (Mon/Wed/Fri)
- **Support Limit:** Max 2 hours/day.
- **Critical Metrics:**
  - Check `/metrics` endpoint for error rates.
  - Monitor Discord for immediate feedback.

## 🛑 Abort Protocols

- **Support Overload:** If support > 2h, pause invites.
- **Critical Error:** If error rate > 5%, rollback immediately.
