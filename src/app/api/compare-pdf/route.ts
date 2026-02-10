import { NextRequest, NextResponse } from "next/server";

// This API route is no longer used - PDF comparison happens client-side
// Keeping this file for backward compatibility, but it just returns an error
export async function POST(req: NextRequest) {
    return NextResponse.json({ 
        error: "PDF comparison has been moved to client-side. Please use the Compare PDF page directly." 
    }, { status: 400 });
}

