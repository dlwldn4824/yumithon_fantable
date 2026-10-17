import { NextResponse } from "next/server";
import { sandbox } from "@/lib/yumi";

export async function GET() {
  return NextResponse.json({ sandbox, newsImages: process.env.NEWS_IMAGES !== "0", kakao: !!process.env.KAKAO_REST_API_KEY });
}
