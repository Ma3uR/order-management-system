import { NextResponse } from 'next/server';
import { sqlAgent } from '@/lib/agents/sql-agent-v2';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, history = [], user } = body;

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }
    
    const queryParams = await sqlAgent.processQuery(query, history, user);
    
    if (queryParams.error || !queryParams.collection) {
      return NextResponse.json(
        { error: queryParams.error || "Failed to process query" },
        { status: 400 }
      );
    }

    const result = await sqlAgent.executeQuery(queryParams);
    
    if (!result || !result.records || result.records.length === 0) {
      return NextResponse.json({
        message: "No records found",
        total: 0,
        count: 0,
        records: []
      });
    }
    
    return NextResponse.json({
      count: result.count,
      total: result.total,
      records: result.records
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process SQL query" },
      { status: 500 }
    );
  }
} 