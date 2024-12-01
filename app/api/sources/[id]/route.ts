import { NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

const pb = new PocketBase('http://pocketbase-d04wg4wgw0cs8kcwoww88w0k.78.47.226.230.sslip.io');

const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

async function authenticateAdmin() {
    if (!adminEmail || !adminPassword) {
        throw new Error('Admin credentials not configured');
    }
    await pb.admins.authWithPassword(adminEmail, adminPassword);
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        await authenticateAdmin();
        await pb.collection('sources').delete(params.id);

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error in DELETE /api/sources/[id]:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 