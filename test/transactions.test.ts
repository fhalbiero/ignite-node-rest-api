import { afterAll, beforeAll, it, describe, expect, beforeEach } from "vitest";
import { execSync } from "node:child_process"
import request from "supertest";
import { app } from "../src/app";

describe('transactions Routes', () => {   
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(async () => {
        execSync('npx knex migrate:rollback --all');
        execSync('npx knex migrate:latest');
    });

    it('should be able to create a new transaction', async () => {
        await request(app.server)
            .post('/transactions')
            .send({
                title: 'New transaction',
                amount: 100,
                type: 'credit',
            })
            .expect(201);
    });

    it('should be able to list all transaction', async () => {
        const createTransactionResponse = await request(app.server)
            .post('/transactions')
            .send({
                title: 'New transaction',
                amount: 100,
                type: 'credit',
            });

        const cookies = createTransactionResponse.headers['set-cookie'];

        const listTransactionsResponse = await request(app.server)
            .get('/transactions')
            .set('Cookie', cookies)
            .expect(200);

        expect(listTransactionsResponse.body.transactions).toEqual([
            expect.objectContaining({
                id: expect.any(String),
                title: 'New transaction',
                amount: 100,
            })
        ]);
    });

    it('should be able to get a specific transaction', async () => {
        const createTransactionResponse = await request(app.server)
            .post('/transactions')
            .send({
                title: 'New transaction',
                amount: 100,
                type: 'credit',
            });

        const cookies = createTransactionResponse.headers['set-cookie'];

        const listTransactionsResponse = await request(app.server)
            .get('/transactions')
            .set('Cookie', cookies)
            .expect(200);

        const transactionId = listTransactionsResponse.body.transactions[0].id;

        const getTransactionResponse = await request(app.server)
            .get(`/transactions/${transactionId}`)
            .set('Cookie', cookies)
            .expect(200);

        expect(getTransactionResponse.body.transaction).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                title: 'New transaction',
                amount: 100,
            })
        );
    });

    it('should be able to get the summary', async () => {
        const createTransactionResponse = await request(app.server)
            .post('/transactions')
            .send({
                title: 'New transaction',
                amount: 5000,
                type: 'credit',
            });

        const cookies = createTransactionResponse.headers['set-cookie'];

        await request(app.server)
            .post('/transactions')
            .set('Cookie', cookies)
            .send({
                title: 'New transaction',
                amount: 1000,
                type: 'debit',
            });

        const summaryResponse = await request(app.server)
            .get('/transactions/summary')
            .set('Cookie', cookies)
            .expect(200);

        expect(summaryResponse.body.summary).toEqual(
            expect.objectContaining({
                amount: 4000,
            })
        );
    });
});