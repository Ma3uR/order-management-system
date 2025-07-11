/**
 * In-memory mock implementations of BullMQ Queue and Job classes for testing
 */

interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  removeOnComplete?: number;
  removeOnFail?: number;
  [key: string]: unknown;
}

interface QueueOptions {
  [key: string]: unknown;
}

export class MockJob {
  id: string;
  data: unknown;
  opts: JobOptions;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
  attemptsMade: number;
  private state: 'waiting' | 'delayed' | 'active' | 'completed' | 'failed';

  constructor(id: string, data: unknown, opts: JobOptions = {}) {
    this.id = id;
    this.data = data;
    this.opts = {
      priority: 0,
      delay: 0,
      attempts: 3,
      removeOnComplete: 100,
      removeOnFail: 50,
      ...opts
    };
    this.timestamp = Date.now();
    this.attemptsMade = 0;
    this.state = opts.delay && opts.delay > 0 ? 'delayed' : 'waiting';
  }

  isActive(): boolean {
    return this.state === 'active';
  }

  isCompleted(): boolean {
    return this.state === 'completed';
  }

  isFailed(): boolean {
    return this.state === 'failed';
  }

  isWaiting(): boolean {
    return this.state === 'waiting';
  }

  isDelayed(): boolean {
    return this.state === 'delayed';
  }

  async retry(): Promise<void> {
    if (this.state === 'failed') {
      this.state = 'waiting';
      this.failedReason = undefined;
      this.attemptsMade = 0;
      this.processedOn = undefined;
      this.finishedOn = undefined;
    }
  }

  async remove(): Promise<void> {
    // Remove from queue will be handled by MockQueue
  }

  // Internal methods for testing
  _setState(state: 'waiting' | 'delayed' | 'active' | 'completed' | 'failed'): void {
    this.state = state;
    if (state === 'active') {
      this.processedOn = Date.now();
    }
    if (state === 'completed' || state === 'failed') {
      this.finishedOn = Date.now();
    }
  }

  _setFailedReason(reason: string): void {
    this.failedReason = reason;
    this.state = 'failed';
    this.attemptsMade += 1;
    this.finishedOn = Date.now();
  }

  _complete(): void {
    this.state = 'completed';
    this.finishedOn = Date.now();
  }
}

export class MockQueue {
  name: string;
  private jobs: Map<string, MockJob> = new Map();
  private jobCounter = 1;
  private opts?: QueueOptions;
  
  constructor(name: string, opts?: QueueOptions) {
    this.name = name;
    this.opts = opts;
  }

  async add(_jobName: string, data: unknown, opts: JobOptions = {}): Promise<MockJob> {
    const jobId = `${this.jobCounter++}`;
    const job = new MockJob(jobId, data, opts);
    this.jobs.set(jobId, job);
    return job;
  }

  async getJob(jobId: string): Promise<MockJob | undefined> {
    return this.jobs.get(jobId);
  }

  async getJobs(types: string[], start: number = 0, end: number = -1): Promise<MockJob[]> {
    const allJobs = Array.from(this.jobs.values());
    const filteredJobs = allJobs.filter(job => {
      if (types.includes('waiting') && job.isWaiting()) return true;
      if (types.includes('delayed') && job.isDelayed()) return true;
      if (types.includes('active') && job.isActive()) return true;
      if (types.includes('completed') && job.isCompleted()) return true;
      if (types.includes('failed') && job.isFailed()) return true;
      return false;
    });

    // Sort by timestamp (newest first)
    filteredJobs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    if (end === -1) end = filteredJobs.length - 1;
    return filteredJobs.slice(start, end + 1);
  }

  async getWaiting(): Promise<MockJob[]> {
    return Array.from(this.jobs.values()).filter(job => job.isWaiting());
  }

  async getActive(): Promise<MockJob[]> {
    return Array.from(this.jobs.values()).filter(job => job.isActive());
  }

  async getCompleted(): Promise<MockJob[]> {
    return Array.from(this.jobs.values()).filter(job => job.isCompleted());
  }

  async getFailed(): Promise<MockJob[]> {
    return Array.from(this.jobs.values()).filter(job => job.isFailed());
  }

  async getDelayed(): Promise<MockJob[]> {
    const delayedJobs = Array.from(this.jobs.values()).filter(job => job.isDelayed());
    // Sort by timestamp to simulate BullMQ's behavior of returning next scheduled first
    return delayedJobs.sort((a, b) => a.timestamp - b.timestamp);
  }

  async clean(grace: number, _limit: number, type: 'completed' | 'failed'): Promise<MockJob[]> {
    const cutoffTime = Date.now() - grace;
    const jobsToRemove: MockJob[] = [];

    for (const [jobId, job] of Array.from(this.jobs.entries())) {
      if (type === 'completed' && job.isCompleted() && job.finishedOn && job.finishedOn < cutoffTime) {
        jobsToRemove.push(job);
        this.jobs.delete(jobId);
      }
      if (type === 'failed' && job.isFailed() && job.finishedOn && job.finishedOn < cutoffTime) {
        jobsToRemove.push(job);
        this.jobs.delete(jobId);
      }
    }

    return jobsToRemove;
  }

  async pause(): Promise<void> {
    // Mock implementation
  }

  async resume(): Promise<void> {
    // Mock implementation
  }

  async close(): Promise<void> {
    this.jobs.clear();
  }

  // Test utility methods
  _removeJob(jobId: string): void {
    this.jobs.delete(jobId);
  }

  _getJobById(jobId: string): MockJob | undefined {
    return this.jobs.get(jobId);
  }

  _getAllJobs(): MockJob[] {
    return Array.from(this.jobs.values());
  }

  _setJobState(jobId: string, state: 'waiting' | 'delayed' | 'active' | 'completed' | 'failed'): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job._setState(state);
    }
  }

  _setJobFailed(jobId: string, reason: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job._setFailedReason(reason);
    }
  }

  _completeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job._complete();
    }
  }

  _clear(): void {
    this.jobs.clear();
    this.jobCounter = 1;
  }
}

// Export types for compatibility
export type JobType = 'waiting' | 'delayed' | 'active' | 'completed' | 'failed';
