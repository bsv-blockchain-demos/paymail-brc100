const requestQueue: { url: string; resolve: (value: Response) => void; reject: (reason?: any) => void; }[] = [];

let isProcessing = false;

let lastRequestTime = 0;

const MIN_INTERVAL = 334; // ms for ~3 requests per second

export async function queuedFetch(url: string): Promise<Response> {
  return new Promise((resolve, reject) => {
    requestQueue.push({ url, resolve, reject });
    if (!isProcessing) {
      processQueue();
    }
  });
}

async function processQueue() {
  isProcessing = true;
  while (requestQueue.length > 0) {
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime;
    if (timeSinceLast < MIN_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL - timeSinceLast));
    }
    lastRequestTime = Date.now();
    const item = requestQueue.shift()!;
    try {
      const response = await fetch(item.url);
      item.resolve(response);
    } catch (error) {
      item.reject(error);
    }
  }
  isProcessing = false;
}