import { NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

const pb = new PocketBase('http://pocketbase-d04wg4wgw0cs8kcwoww88w0k.78.47.226.230.sslip.io');

// Admin authentication
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

async function authenticateAdmin() {
    if (!adminEmail || !adminPassword) {
        throw new Error('Admin credentials not configured');
    }
    await pb.admins.authWithPassword(adminEmail, adminPassword);
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        await authenticateAdmin();
        const records = await pb.collection('sources').getFullList({
            sort: '-created',
        });

        return NextResponse.json(records);
    } catch (error) {
        console.error('Error in GET /api/sources:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        await authenticateAdmin();
        const record = await pb.collection('sources').create(body);

        return NextResponse.json(record);
    } catch (error) {
        console.error('Error in POST /api/sources:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 