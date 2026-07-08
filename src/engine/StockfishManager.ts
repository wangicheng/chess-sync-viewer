export type EngineScore = {
  type: 'cp' | 'mate';
  value: number; // Positive means advantage for White, negative for Black
  bestMove?: string;
};

export class StockfishManager {
  private worker: Worker | null = null;
  private onScoreUpdate: ((score: EngineScore) => void) | null = null;
  private currentTurn: 'w' | 'b' = 'w';
  private pendingFen: string | null = null;
  private lastBestMove?: string;

  constructor() {
    this.init();
  }

  private init() {
    if (this.worker) return;
    
    this.worker = new Worker(`${import.meta.env.BASE_URL}engine/stockfish.js`);
    
    this.worker.onmessage = (e) => {
      const line = e.data;
      if (typeof line !== 'string') return;
      
      if (line === 'readyok') {
        if (this.pendingFen) {
          const fen = this.pendingFen;
          this.pendingFen = null;
          
          const fenParts = fen.split(' ');
          if (fenParts.length > 1) {
            this.currentTurn = fenParts[1] as 'w' | 'b';
          } else {
            this.currentTurn = 'w';
          }

          this.worker?.postMessage(`position fen ${fen}`);
          this.worker?.postMessage('go depth 24');
        }
      } else if (line.startsWith('info depth')) {
        this.parseInfo(line);
      }
    };
    
    this.worker.postMessage('uci');
  }

  private parseInfo(line: string) {
    if (!this.onScoreUpdate) return;
    // Do not emit scores if we are waiting to start a new fen
    // The old scores might still arrive before readyok, but we can safely ignore them or process them.
    // Processing them with the *old* currentTurn is fine, but ignoring them prevents jitter.
    if (this.pendingFen) return;
    
    const matchCp = line.match(/score cp (-?\d+)/);
    const matchMate = line.match(/score mate (-?\d+)/);
    const matchPv = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
    
    let bestMove: string | undefined;
    if (matchPv) {
      bestMove = matchPv[1];
      this.lastBestMove = bestMove;
    } else {
      bestMove = this.lastBestMove;
    }
    
    if (matchMate) {
      let value = parseInt(matchMate[1], 10);
      if (this.currentTurn === 'b') {
        value = -value;
      }
      this.onScoreUpdate({ type: 'mate', value, bestMove });
    } else if (matchCp) {
      let value = parseInt(matchCp[1], 10);
      if (this.currentTurn === 'b') {
        value = -value;
      }
      this.onScoreUpdate({ type: 'cp', value, bestMove });
    }
  }

  public setOnScoreUpdate(callback: (score: EngineScore) => void) {
    this.onScoreUpdate = callback;
  }

  public evaluate(fen: string) {
    if (!this.worker) this.init();
    
    this.pendingFen = fen;
    this.lastBestMove = undefined;
    this.worker?.postMessage('stop');
    this.worker?.postMessage('isready');
  }

  public stop() {
    if (this.worker) {
      this.pendingFen = null;
      this.worker.postMessage('stop');
    }
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
