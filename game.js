// クラスを使ってオブジェクトを管理する、最新のES6+の書き方です。

class GameObject {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
    }
    draw(ctx) {
        // 各オブジェクトでオーバーライドする
    }
}

// プレイヤー（パドル）: フューチャー・ミャク
class Paddle extends GameObject {
    constructor(x, y, width, height, color) {
        super(x, y, color);
        this.width = width;
        this.height = height;
    }

    draw(ctx) {
        ctx.beginPath();
        // パドルを光らせるためのグロー効果
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        // 角を少し丸くする
        ctx.roundRect(this.x, this.y, this.width, this.height, 5);
        ctx.fill();
        ctx.closePath();
        // 他の描画にグローが影響しないようにリセット
        ctx.shadowBlur = 0;
    }
}

// ボール: いのちボール
class Ball extends GameObject {
    constructor(x, y, radius, color, dx, dy) {
        super(x, y, color);
        this.radius = radius;
        this.dx = dx; // X方向の速度
        this.dy = dy; // Y方向の速度
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
        ctx.shadowBlur = 0;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
    }
}

// ブロック: 未来のパビリオン
class Brick extends GameObject {
    constructor(x, y, width, height, color, scoreValue) {
        super(x, y, color);
        this.width = width;
        this.height = height;
        this.scoreValue = scoreValue;
        this.status = 1; // 1: 存在する, 0: 破壊された
    }

    draw(ctx) {
        if (this.status === 1) {
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.stroke();
            ctx.closePath();
        }
    }
}

// ゲーム管理クラス
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        // 解像度を上げて綺麗にする（Retina対応）
        this.canvas.width = 800 * devicePixelRatio;
        this.canvas.height = 600 * devicePixelRatio;
        this.canvas.style.width = '800px';
        this.canvas.style.height = '600px';
        this.ctx.scale(devicePixelRatio, devicePixelRatio);
        this.width = 800;
        this.height = 600;

        // UI要素
        this.scoreSpan = document.getElementById('score');
        this.livesSpan = document.getElementById('lives');
        this.messageContainer = document.getElementById('message-container');
        this.messageText = document.getElementById('message-text');

        // ゲームの状態
        this.score = 0;
        this.lives = 3;
        this.isGameOver = false;
        this.isGameWin = false;
        this.animationId = null;

        this.init();
        
        // イベントリスナーの登録
        document.addEventListener('mousemove', (e) => this.mouseMoveHandler(e));
        this.messageContainer.addEventListener('click', () => this.restart());
    }

    init() {
        // オブジェクトの初期化
        const paddleWidth = 100;
        const paddleHeight = 15;
        this.paddle = new Paddle((this.width - paddleWidth) / 2, this.height - paddleHeight - 10, paddleWidth, paddleHeight, '#0ff'); // ネオンブルー
        
        const ballRadius = 8;
        this.ball = new Ball(this.width / 2, this.paddle.y - ballRadius, ballRadius, '#f00', 4, -4); // いのちボール（赤）

        // ブロックの配置
        this.bricks = [];
        const brickRowCount = 6;
        const brickColumnCount = 9;
        const brickWidth = 75;
        const brickHeight = 20;
        const brickPadding = 10;
        const brickOffsetTop = 60;
        const brickOffsetLeft = 20;
        // ミャクミャクカラー（赤と青）の配列
        const colors = ['#f00', '#f00', '#00f', '#00f', '#f00', '#f00'];

        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                this.bricks.push(new Brick(brickX, brickY, brickWidth, brickHeight, colors[r], 100));
            }
        }

        // UIを更新
        this.updateUI();
        this.hideMessage();
        this.isGameOver = false;
        this.isGameWin = false;
    }

    // マウス操作
    mouseMoveHandler(e) {
        const relativeX = e.clientX - this.canvas.offsetLeft;
        if (relativeX > 0 && relativeX < this.width) {
            this.paddle.x = relativeX - this.paddle.width / 2;
        }
    }

    // 衝突検知
    collisionDetection() {
        // 壁との衝突
        if (this.ball.x + this.ball.dx > this.width - this.ball.radius || this.ball.x + this.ball.dx < this.ball.radius) {
            this.ball.dx = -this.ball.dx;
        }
        if (this.ball.y + this.ball.dy < this.ball.radius) {
            this.ball.dy = -this.ball.dy;
        } else if (this.ball.y + this.ball.dy > this.height - this.ball.radius) {
            // パドルとの衝突
            if (this.ball.x > this.paddle.x && this.ball.x < this.paddle.x + this.paddle.width) {
                // ボールの跳ね返る角度を変える
                let hitPos = (this.ball.x - (this.paddle.x + this.paddle.width / 2)) / (this.paddle.width / 2);
                this.ball.dx = 6 * hitPos;
                this.ball.dy = -this.ball.dy;
            } else {
                // ミス
                this.lives--;
                if (this.lives <= 0) {
                    this.isGameOver = true;
                    this.showMessage("GAME OVER");
                } else {
                    // ボールとパドルをリセット
                    this.ball.x = this.width / 2;
                    this.ball.y = this.height / 2;
                    this.ball.dx = 4;
                    this.ball.dy = -4;
                    this.paddle.x = (this.width - this.paddle.width) / 2;
                }
                this.updateUI();
            }
        }

        // ブロックとの衝突
        for (let brick of this.bricks) {
            if (brick.status === 1) {
                if (this.ball.x > brick.x && this.ball.x < brick.x + brick.width && this.ball.y > brick.y && this.ball.y < brick.y + brick.height) {
                    this.ball.dy = -this.ball.dy;
                    brick.status = 0; // ブロックを破壊
                    this.score += brick.scoreValue;
                    this.updateUI();
                    this.checkWin();
                }
            }
        }
    }

    // クリア判定
    checkWin() {
        if (this.bricks.every(brick => brick.status === 0)) {
            this.isGameWin = true;
            this.showMessage("STAGE CLEAR!");
        }
    }

    updateUI() {
        this.scoreSpan.innerText = this.score;
        this.livesSpan.innerText = this.lives;
    }

    showMessage(text) {
        this.messageText.innerText = text;
        this.messageContainer.classList.remove('hidden');
    }

    hideMessage() {
        this.messageContainer.classList.add('hidden');
    }

    restart() {
        if (this.isGameOver || this.isGameWin) {
            cancelAnimationFrame(this.animationId);
            this.score = 0;
            this.lives = 3;
            this.init();
            this.start();
        }
    }

    // メインのゲームループ
    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height); // 画面をクリア

        // 各オブジェクトを描画
        this.bricks.forEach(brick => brick.draw(this.ctx));
        this.paddle.draw(this.ctx);
        this.ball.draw(this.ctx);

        // ゲームが進行中なら、更新とループを続ける
        if (!this.isGameOver && !this.isGameWin) {
            this.collisionDetection();
            this.ball.update();
            this.animationId = requestAnimationFrame(() => this.draw());
        }
    }

    start() {
        this.draw();
    }
}

// ゲームを開始
const expoBreakout = new Game();
expoBreakout.start();