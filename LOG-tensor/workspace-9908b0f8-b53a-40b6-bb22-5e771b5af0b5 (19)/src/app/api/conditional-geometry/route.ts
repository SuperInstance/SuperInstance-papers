import { NextRequest, NextResponse } from 'next/server';
import { ConditionalGeometry } from '@/lib/polln';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, points, probabilities, conditions } = body;

    const cg = new ConditionalGeometry(3);

    switch (action) {
      case 'transform': {
        // Full transformation: Ψ: (X, P, C) → (X', P', C')
        const result = cg.transform(
          points || ConditionalGeometry.generatePoints(10, 3),
          probabilities || ConditionalGeometry.uniformDistribution(3),
          conditions || {}
        );
        
        return NextResponse.json({
          success: true,
          action: 'transform',
          result: {
            X_prime: result.X_prime,
            P_prime: result.P_prime,
            C_prime: result.C_prime
          },
          formula: 'Ψ: (X, P, C) → (X\', P\', C\')',
          insight: 'Geometry that breathes probability'
        });
      }

      case 'monty_hall': {
        // Monty Hall Fold: T_fold(p)_i = p_i + p_opened
        const probs = probabilities || [1/3, 1/3, 1/3];
        const opened = conditions?.openedDoor || 0;
        const result = cg.montyHallFold(probs, opened);
        
        return NextResponse.json({
          success: true,
          action: 'monty_hall',
          initial_probs: probs,
          opened_door: opened,
          result_probs: result,
          formula: 'T_fold(p)_i = p_i + p_opened',
          insight: 'Opening a door redistributes probability to remaining options'
        });
      }

      case 'geometric_fold': {
        // Geometric fold along an axis
        const X = points || ConditionalGeometry.generatePoints(10, 3);
        const foldAxis = conditions?.foldAxis ?? 0;
        const foldPosition = conditions?.foldPosition ?? 0.5;
        const result = cg.geometricFold(X, foldAxis, foldPosition);
        
        return NextResponse.json({
          success: true,
          action: 'geometric_fold',
          points_before: X,
          points_after: result,
          fold_axis: foldAxis,
          fold_position: foldPosition,
          insight: 'Folding space transforms coordinates through reflection'
        });
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action. Use: transform, monty_hall, or geometric_fold'
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
  return NextResponse.json({
    module: 'Conditional Geometry',
    description: 'Ψ: (X, P, C) → (X\', P\', C\') - Geometry that breathes probability',
    actions: [
      {
        action: 'transform',
        description: 'Full conditional geometry transformation',
        parameters: ['points', 'probabilities', 'conditions']
      },
      {
        action: 'monty_hall',
        description: 'Monty Hall fold operation on probability',
        parameters: ['probabilities', 'conditions.openedDoor']
      },
      {
        action: 'geometric_fold',
        description: 'Fold geometric space along an axis',
        parameters: ['points', 'conditions.foldAxis', 'conditions.foldPosition']
      }
    ],
    formulas: [
      'Ψ: (X, P, C) → (X\', P\', C\')',
      'T_fold(p)_i = p_i + p_opened',
      'P(A|B) = P(B|A) * P(A) / P(B)'
    ]
  });
}
