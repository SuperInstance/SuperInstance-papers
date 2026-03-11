import { NextRequest, NextResponse } from 'next/server';
import { FoldableTensor } from '@/lib/polln';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, shape, data, operations } = body;

    switch (action) {
      case 'create': {
        // Create a new foldable tensor
        const tensorShape = shape || [4, 4, 4];
        const tensor = FoldableTensor.random(tensorShape);
        
        const key1 = tensor.computeAssemblyKey();
        
        return NextResponse.json({
          success: true,
          action: 'create',
          shape: tensorShape,
          size: tensor.size,
          initial_key: key1,
          state: tensor.getState(),
          formula: 'F = (F_flat, C, P, K)',
          insight: 'High-dimensional tensors encoded in 2D with folding instructions'
        });
      }

      case 'encode': {
        // Encode tensor as 2D with folding instructions
        const tensorShape = shape || [4, 4, 4];
        const tensor = new FoldableTensor(tensorShape, data);
        
        // Apply any operations
        if (operations) {
          for (const op of operations) {
            if (op.type === 'crease') {
              tensor.addCrease(op.axis, op.position, op.foldType);
            } else if (op.type === 'permute') {
              tensor.applyPermutation(op.permutation, op.axis);
            }
          }
        }
        
        const encoded = tensor.encode2D();
        const key = tensor.computeAssemblyKey();
        
        return NextResponse.json({
          success: true,
          action: 'encode',
          flat_shape: encoded.shape2d,
          assembly_key: key,
          instructions: encoded.instructions,
          creases_count: tensor.getState().creases.length,
          permutations_count: tensor.getState().permutations.length
        });
      }

      case 'folding_group': {
        // Compute folding group order: |G_F| = 2^(n-1) × n!
        const n = body.n || 4;
        const order = FoldableTensor.computeFoldingGroupOrder(n);
        
        return NextResponse.json({
          success: true,
          action: 'folding_group',
          n: n,
          order: order,
          formula: '|G_F| = 2^(n-1) × n!',
          structure: 'G_F ≅ (Z₂)^(n-1) ⋊ S_n'
        });
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action. Use: create, encode, or folding_group'
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
    module: 'Foldable Tensors',
    description: 'F = (F_flat, C, P, K) - High-dimensional tensors encoded in 2D',
    actions: [
      {
        action: 'create',
        description: 'Create a new foldable tensor',
        parameters: ['shape']
      },
      {
        action: 'encode',
        description: 'Encode tensor as 2D with folding instructions',
        parameters: ['shape', 'data', 'operations']
      },
      {
        action: 'folding_group',
        description: 'Compute folding group order',
        parameters: ['n']
      }
    ],
    formulas: [
      'F = (F_flat, C, P, K)',
      '|G_F| = 2^(n-1) × n!',
      'G_F ≅ (Z₂)^(n-1) ⋊ S_n'
    ]
  });
}
