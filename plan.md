1- setup ai chat in the pet project 
2- give the ai chat the custom tools in needs to talk to the db
    . for example give it a get all orders tool, getOrderById tool, getOrderInRange tool, getOrderByFilter 


3- use generative ui to create 2 component one for generating pdf report from html page, another for generating excel 
sheet from a csv
4- 

# Advantages of Using Vercel AI SDK

1. **Streaming Responses**
   - Real-time token streaming for immediate user feedback
   - Reduces perceived latency with progressive rendering
   - Better UX with visible AI thinking process

2. **Built-in History Management**
   - Automatic conversation state tracking
   - Easy implementation of chat history persistence
   - Simplified context window management for more coherent responses

3. **Tool Calling Support**
   - Seamless integration with custom functions (DB queries, etc.)
   - Structured function calling with type safety
   - Perfect for implementing order tools (getOrderById, getOrderByFilter)

4. **React Hooks Integration**
   - useChat, useCompletion hooks for quick implementation
   - Simplified state management with React
   - Reduced boilerplate code

5. **UI Components**
   - Ready-to-use components that work with streaming
   - Customizable message rendering
   - Perfect for generative UI components (PDF/Excel generators)

6. **Multi-provider Support**
   - Easy switching between OpenAI, Anthropic, etc.
   - Consistent API across different LLM providers
   - Future-proof implementation