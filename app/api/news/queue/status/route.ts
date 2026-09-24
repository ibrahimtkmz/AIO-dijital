import {NextResponse} from "next/server";
import {listQueue} from "@/lib/news/queue";
export const dynamic="force-dynamic";
export async function GET(){return NextResponse.json({items:await listQueue()});}
