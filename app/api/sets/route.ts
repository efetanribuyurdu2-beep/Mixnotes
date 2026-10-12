export function GET() {
  return Response.json(
    { error: "Bu uç nokta arşivlendi. MixNotes Preparation Core API kullanılıyor." },
    { status: 410 },
  );
}

export const POST = GET;
export const DELETE = GET;
