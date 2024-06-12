import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { knex } from "../database";
import { z } from "zod";
import { checkSessionIdExists } from "../middlewares/check-session-id-exists";


// Unit tests - test a single function without dependencies and context
// Integrated tests - test a group of functions, the communication between them
// e2e - end to end - test the whole system by simulating the user behavior

// pyramid of tests - implement lots of unit test, some integrated tests and less e2e tests, e2e have no technical details, integrated tests have some, unit tests have a lot of technical details

export async function transactionsRoutes(app: FastifyInstance) {
    app.addHook('preHandler', async (request, reply) => {
        console.log(`[transactionsRoutes] [${request.method} ${request.url}] [${request.ip}] [${request.headers['user-agent']}]`);
    });

    app.get("/", { preHandler: [checkSessionIdExists] }, async (request, reply) => {
        const { sessionId } = request.cookies;

        const transactions = await knex('transactions')
            .where({ session_id: sessionId })
            .select();

        return { transactions };
    });

    app.get("/:id", { preHandler: [checkSessionIdExists] }, async (request, reply) => {
        const { sessionId } = request.cookies;

        const getTransactionParamsSchema = z.object({
            id: z.string().uuid(),
        });

        const { id } = getTransactionParamsSchema.parse(request.params);

        const transaction = await knex('transactions')
            .where({ 
                id,
                session_id: sessionId, 
            })
            .first();

        if (!transaction) {
            return {
                error: 'Transaction not found',
            };
        }

        return {
            transaction,
        };
    });

    app.get("/summary", { preHandler: [checkSessionIdExists] }, async (request) => {
        const { sessionId } = request.cookies;

        const summary = await knex('transactions')
            .where({ session_id: sessionId })
            .sum('amount', { as: 'amount' })
            .first();

        return {
            summary: summary || 0,
        };
    });

    app.post("/", async (request, reply) => {
        const createTransactionBodySchema = z.object({
            title: z.string(),
            amount: z.number(),
            type: z.enum(['credit', 'debit']),
        });

        const {title, amount, type} = createTransactionBodySchema.parse(request.body);

        let sessionId = request.cookies.sessionId;

        if (!sessionId) {
            sessionId = randomUUID();
            reply.cookie('sessionId', sessionId, {
                path: '/',
                maxAge: 60 * 60 * 24 * 7, // 7 days
            });
        }

        await knex('transactions').insert({
            id: randomUUID(),
            title,
            amount: type === 'credit' ? amount : amount * -1,
            session_id: sessionId,
        });

        return reply.status(201).send();
    });
}