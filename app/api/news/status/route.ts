import { NextResponse } from "next/server";
import { listNews } from "@/lib/news/store";
export const dynamic="force-dynamic";
export async function GET(){ return NextResponse.json({items:listNews()}); }