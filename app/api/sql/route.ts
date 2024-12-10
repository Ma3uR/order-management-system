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

    console.log('Processing query:', query);
    
    // Process the query to get collection and filters
    const queryParams = await sqlAgent.processQuery(query, history, user);
    console.log('Query parameters:', queryParams);
    
    if (queryParams.error || !queryParams.collection) {
      return NextResponse.json(
        { error: queryParams.error || "Failed to process query" },
        { status: 400 }
      );
    }

    // Execute the query
    const result = await sqlAgent.executeQuery(queryParams);
    console.log('SQL Agent result:', JSON.stringify(result, null, 2));
    
    // Check if we have records
    if (!result || !result.records || result.records.length === 0) {
      console.log('No records found in result:', result);
      return NextResponse.json({
        message: "No records found",
        total: 0,
        count: 0,
        records: []
      });
    }
    
    // Return the successful response
    const response = {
      count: result.count,
      total: result.total,
      records: result.records
    };
    
    console.log('Sending response:', JSON.stringify(response, null, 2));
    return NextResponse.json(response);
  } catch (error) {
    console.error('SQL Agent Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process SQL query" },
      { status: 500 }
    );
  }
} 