import { NextRequest, NextResponse } from 'next/server';
import { SMPLifecycle } from '@/lib/polln';

// Singleton lifecycle manager
let lifecycle: InstanceType<typeof SMPLifecycle> | null = null;

function getLifecycle() {
  if (!lifecycle) {
    lifecycle = new SMPLifecycle();
    // Create default checker
    lifecycle.createChecker('default');
  }
  return lifecycle;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    const lc = getLifecycle();

    switch (action) {
      case 'create_cell': {
        const { id, seedValue, modelName, promptTemplate, variables } = body;
        const cell = lc.createCell(
          id || `cell_${Date.now()}`,
          seedValue || 'deterministic_seed',
          modelName || 'meta-llama/Llama-3-70b-chat-hf',
          promptTemplate || 'You are a {role}. Answer: {question}',
          variables || ['role', 'question']
        );
        
        return NextResponse.json({
          success: true,
          action: 'create_cell',
          cell: {
            id: cell.id,
            fingerprint: cell.fingerprint,
            lockStatus: cell.lockStatus,
            createdAt: cell.createdAt,
            seed: cell.seed,
            model: cell.model
          }
        });
      }

      case 'create_bot': {
        const { id, cellId } = body;
        const bot = lc.createBot(id || `bot_${Date.now()}`, cellId);
        
        if (!bot) {
          return NextResponse.json({
            success: false,
            error: `Cell ${cellId} not found`
          }, { status: 404 });
        }
        
        return NextResponse.json({
          success: true,
          action: 'create_bot',
          bot: {
            id: bot.id,
            cellId: bot.cell.id,
            state: bot.state,
            gpuAdvantages: bot.getGPUAdvantages()
          }
        });
      }

      case 'lock_cell': {
        const { cellId } = body;
        const cell = lc.getCell(cellId);
        
        if (!cell) {
          return NextResponse.json({
            success: false,
            error: `Cell ${cellId} not found`
          }, { status: 404 });
        }
        
        const locked = cell.lock();
        
        return NextResponse.json({
          success: locked,
          action: 'lock_cell',
          cellId: cellId,
          lockStatus: cell.lockStatus,
          fingerprint: cell.fingerprint
        });
      }

      case 'execute': {
        const { botId, variables } = body;
        const bot = lc.getBot(botId);
        
        if (!bot) {
          return NextResponse.json({
            success: false,
            error: `Bot ${botId} not found`
          }, { status: 404 });
        }
        
        bot.activate();
        const result = bot.execute(variables || {});
        
        return NextResponse.json({
          success: true,
          action: 'execute',
          botId: botId,
          executionCount: bot.executionCount,
          result: result
        });
      }

      case 'check': {
        const { botId, checkerName } = body;
        const bot = lc.getBot(botId);
        const checker = lc.getChecker(checkerName || 'default');
        
        if (!bot) {
          return NextResponse.json({
            success: false,
            error: `Bot ${botId} not found`
          }, { status: 404 });
        }
        
        if (!checker) {
          return NextResponse.json({
            success: false,
            error: `Checker ${checkerName} not found`
          }, { status: 404 });
        }
        
        const checkResult = checker.checkBot(bot);
        
        return NextResponse.json({
          success: true,
          action: 'check',
          checkResult: checkResult
        });
      }

      case 'lifecycle': {
        const { botId, cellId, variables, checkerName } = body;
        
        // Create cell if not exists
        let cell = lc.getCell(cellId || 'default_cell');
        if (!cell) {
          cell = lc.createCell(
            cellId || 'default_cell',
            body.seedValue || 'deterministic_seed',
            body.modelName || 'meta-llama/Llama-3-70b-chat-hf',
            body.promptTemplate || 'Process: {input}',
            body.variables || ['input']
          );
        }
        
        // Create bot if not exists
        let bot = lc.getBot(botId || 'default_bot');
        if (!bot) {
          bot = lc.createBot(botId || 'default_bot', cell.id);
        }
        
        // Lock cell
        cell.lock();
        
        // Execute
        bot.activate();
        const execResult = bot.execute(variables || { input: 'test' });
        
        // Check
        const checker = lc.getChecker(checkerName || 'default');
        const checkResult = checker?.checkBot(bot);
        
        // Determine adjustment
        const needsAdjustment = checkResult && !checkResult.overallPassed;
        
        // Evolution: promote if performing well
        let evolution = 'continue_monitoring';
        if (bot.executionCount > 10 && bot.errorCount === 0) {
          cell.freeze();
          evolution = 'promoted_to_frozen';
        }
        
        return NextResponse.json({
          success: true,
          action: 'lifecycle',
          stages: {
            locking: { status: cell.lockStatus, fingerprint: cell.fingerprint },
            execution: execResult,
            checking: checkResult,
            adjustment: { needsAdjustment },
            evolution: { status: evolution }
          }
        });
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action. Use: create_cell, create_bot, lock_cell, execute, check, or lifecycle'
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  const lc = getLifecycle();
  
  return NextResponse.json({
    module: 'SMP Architecture',
    description: 'Seed + Model + Prompt = Locked Static Program',
    cells: lc.listCells().map(c => ({
      id: c.id,
      fingerprint: c.fingerprint,
      lockStatus: c.lockStatus
    })),
    bots: lc.listBots().map(b => ({
      id: b.id,
      cellId: b.cell.id,
      state: b.state,
      executionCount: b.executionCount
    })),
    actions: [
      'create_cell',
      'create_bot',
      'lock_cell',
      'execute',
      'check',
      'lifecycle'
    ]
  });
}
