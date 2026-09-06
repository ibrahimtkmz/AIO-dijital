import { NextRequest, NextResponse } from 'next/server';
export function middleware(request: NextRequest) { const secret=process.env.ADMIN_SECRET; const authorization=request.headers.get('authorization'); if (!secret || authorization !== `Bearer ${secret}`) return new NextResponse('Admin authentication required.',{status:401,headers:{'WWW-Authenticate':'Bearer realm="AIO Admin"'}}); return NextResponse.next(); }
export const config={matcher:['/admin/:path*','/api/admin/:path*']};
