import { Test } from "@nestjs/testing"
import { mockEntityManager } from "@starci/jest-preset"
import { PRIMARY_ENTITY_MANAGER, SEED_ROOT } from "./primary.decorators"
import { SeedRunnerService } from "./seed-runner.service"

describe("SeedRunnerService", () => {
    it("runs the shared seeds and then the environment's, each level in name order, skipping empty and non-SQL files", async () => {
        const entityManager = mockEntityManager({
            query: [
                ["SELECT 1\n", []],
                ["SELECT 2\n", []],
                ["SELECT 3\n", []],
            ],
        })
        const moduleRef = await Test.createTestingModule({
            providers: [
                SeedRunnerService,
                { provide: PRIMARY_ENTITY_MANAGER, useValue: entityManager },
                { provide: SEED_ROOT, useValue: "src/tests/fixtures/seeds/ordered" },
            ],
        }).compile()

        await moduleRef.get(SeedRunnerService).run()

        expect(entityManager.query.mock.calls).toEqual([["SELECT 1\n"], ["SELECT 2\n"], ["SELECT 3\n"]])
    })

    it("runs nothing when neither seed folder exists", async () => {
        const entityManager = mockEntityManager()
        const moduleRef = await Test.createTestingModule({
            providers: [
                SeedRunnerService,
                { provide: PRIMARY_ENTITY_MANAGER, useValue: entityManager },
                { provide: SEED_ROOT, useValue: "src/tests/fixtures/seeds/absent" },
            ],
        }).compile()

        await moduleRef.get(SeedRunnerService).run("production")

        expect(entityManager.query).not.toHaveBeenCalled()
    })

    it("propagates a seed folder that cannot be read", async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                SeedRunnerService,
                { provide: PRIMARY_ENTITY_MANAGER, useValue: mockEntityManager() },
                { provide: SEED_ROOT, useValue: "src/tests/fixtures/seeds/blocked" },
            ],
        }).compile()

        await expect(moduleRef.get(SeedRunnerService).run()).rejects.toEqual(
            expect.objectContaining({ code: "ENOTDIR" }),
        )
    })
})
