import * as Phaser from 'phaser'

export class SplashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SplashScene' })
  }

  preload() {
    // Solo cargamos el logo principal — el que ya funciona bien
    this.load.image('logo-xatruch', '/XatruchRPG/assets/logo-xatruch.png')
    // bg-splash es opcional: si no existe, el fondo se genera por código
    this.load.image('bg-splash', '/XatruchRPG/assets/bg-splash.jpg')
  }

  create() {
    const { width, height } = this.scale

    // ── FONDO ──────────────────────────────────────────────────────────────
    // Si el asset cargó, úsalo; si no, fondo generado por código
    if (this.textures.exists('bg-splash') &&
        this.textures.get('bg-splash').key !== '__MISSING') {
      const bg = this.add.image(width / 2, height / 2, 'bg-splash')
      bg.setDisplaySize(width, height)
    } else {
      this._buildProceduralBg(width, height)
    }

    // Overlay gradiente oscuro encima del fondo
    const overlay = this.add.graphics()
    overlay.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.1, 0.1, 0.85, 0.85)
    overlay.fillRect(0, 0, width, height)

    // ── PARTÍCULAS DE LUZ (efecto bosque / naturaleza hondureña) ───────────
    this._buildParticles(width, height)

    // ── LOGO ZSTUDIOS — texto puro, sin imagen ─────────────────────────────
    // Línea decorativa izquierda
    const lineLeft = this.add.graphics()
    lineLeft.lineStyle(1, 0xc9a84c, 0.6)
    lineLeft.lineBetween(width / 2 - 90, height * 0.13, width / 2 - 10, height * 0.13)

    // Texto principal ZStudios
    const zText = this.add.text(width / 2, height * 0.13, 'Z·STUDIOS', {
      fontSize: '15px',
      color: '#c9a84c',
      fontStyle: 'bold',
      letterSpacing: 8,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setAlpha(0)

    // Línea decorativa derecha
    const lineRight = this.add.graphics()
    lineRight.lineStyle(1, 0xc9a84c, 0.6)
    lineRight.lineBetween(width / 2 + 10, height * 0.13, width / 2 + 90, height * 0.13)

    // Subtexto "PRESENTA"
    const presLabel = this.add.text(width / 2, height * 0.175, 'P  R  E  S  E  N  T  A', {
      fontSize: '8px',
      color: '#888866',
      letterSpacing: 3
    }).setOrigin(0.5).setAlpha(0)

    // ── LOGO XATRUCH RPG ────────────────────────────────────────────────────
    const xLogo = this.add.image(width / 2, height * 0.46, 'logo-xatruch')
    xLogo.setDisplaySize(Math.min(width * 0.82, 320), Math.min(width * 0.82, 320))
    xLogo.setAlpha(0)

    // ── BOTÓN JUGAR ─────────────────────────────────────────────────────────
    const btnY = height * 0.78

    // Fondo del botón con efecto metálico
    const btnGfx = this.add.graphics().setAlpha(0)
    this._drawBtn(btnGfx, width / 2, btnY, 220, 52)

    // Texto del botón
    const btnText = this.add.text(width / 2, btnY, '▶   JUGAR', {
      fontSize: '18px',
      color: '#1a1209',
      fontStyle: 'bold',
      letterSpacing: 4,
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(0.5).setAlpha(0)

    // Líneas decorativas bajo el botón
    const deco = this.add.graphics().setAlpha(0)
    deco.lineStyle(1, 0xc9a84c, 0.35)
    deco.lineBetween(width / 2 - 60, btnY + 34, width / 2 + 60, btnY + 34)

    // Texto "Presentado por ZStudios" abajo
    const footText = this.add.text(width / 2, height * 0.9, 'Presentado por ZStudios', {
      fontSize: '11px',
      color: '#555544',
      letterSpacing: 1
    }).setOrigin(0.5).setAlpha(0)

    // ── ANIMACIONES ─────────────────────────────────────────────────────────
    // ZStudios aparece primero
    this.tweens.add({
      targets: [zText, presLabel],
      alpha: 1,
      y: { from: height * 0.13 - 8, to: height * 0.13 },
      duration: 700,
      ease: 'Power2',
      delay: 400
    })
    this.tweens.add({
      targets: presLabel,
      alpha: 1,
      duration: 700,
      ease: 'Power2',
      delay: 700
    })

    // Logo Xatruch con escala y fade
    this.tweens.add({
      targets: xLogo,
      alpha: 1,
      scaleX: { from: 0.88, to: 1 },
      scaleY: { from: 0.88, to: 1 },
      duration: 900,
      ease: 'Back.Out',
      delay: 900
    })

    // Botón aparece
    this.tweens.add({
      targets: [btnGfx, btnText, deco, footText],
      alpha: 1,
      duration: 600,
      ease: 'Power2',
      delay: 1700
    })

    // Pulso sutil del botón
    this.tweens.add({
      targets: [btnGfx, btnText],
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 2400
    })

    // Brillo que recorre el botón de izquierda a derecha
    const shine = this.add.graphics().setAlpha(0)
    this._addShineLoop(shine, width, btnY, 220, 52)

    // ── INTERACTIVIDAD ──────────────────────────────────────────────────────
    const hitArea = this.add.rectangle(width / 2, btnY, 220, 52, 0x000000, 0)
    hitArea.setInteractive()

    hitArea.on('pointerover', () => {
      this.tweens.killTweensOf([btnGfx, btnText])
      this.tweens.add({ targets: [btnGfx, btnText], scaleX: 1.06, scaleY: 1.06, duration: 150 })
    })
    hitArea.on('pointerout', () => {
      this.tweens.add({ targets: [btnGfx, btnText], scaleX: 1, scaleY: 1, duration: 150 })
    })
    hitArea.on('pointerdown', () => this.startGame())
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  _buildProceduralBg(width, height) {
    const g = this.add.graphics()

    // Fondo base — degradado oscuro de bosque hondureño
    g.fillGradientStyle(0x050d05, 0x050d05, 0x0a1a0e, 0x030a06, 1)
    g.fillRect(0, 0, width, height)

    // Círculo de luz tenue al centro
    const cx = width / 2
    const cy = height * 0.42
    for (let r = 260; r > 0; r -= 18) {
      const alpha = (1 - r / 260) * 0.06
      g.fillStyle(0x1a4a1a, alpha)
      g.fillCircle(cx, cy, r)
    }

    // Silueta de montañas al fondo (línea de horizonte)
    const mtn = this.add.graphics()
    mtn.fillStyle(0x040c08, 1)
    mtn.beginPath()
    mtn.moveTo(0, height)
    // Picos de montaña estilizados
    const peaks = [
      [0, height * 0.7],
      [width * 0.1, height * 0.55],
      [width * 0.22, height * 0.65],
      [width * 0.35, height * 0.48],
      [width * 0.5, height * 0.58],
      [width * 0.62, height * 0.45],
      [width * 0.75, height * 0.6],
      [width * 0.88, height * 0.52],
      [width, height * 0.62],
      [width, height]
    ]
    peaks.forEach(([x, y]) => mtn.lineTo(x, y))
    mtn.closePath()
    mtn.fillPath()

    // Niebla baja (efecto Honduras montañoso)
    const fog = this.add.graphics()
    for (let i = 0; i < 5; i++) {
      const fogY = height * (0.55 + i * 0.04)
      fog.fillStyle(0x0d2010, 0.12 - i * 0.02)
      fog.fillEllipse(width / 2, fogY, width * 1.4, 60)
    }
  }

  _buildParticles(width, height) {
    // Partículas de luciérnagas / polvo mágico
    const count = 28
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(20, width - 20)
      const y = Phaser.Math.Between(height * 0.2, height * 0.85)
      const size = Phaser.Math.FloatBetween(1, 3)
      const colors = [0xc9a84c, 0x5aaa5a, 0x88ddaa, 0xffd97a]
      const color = Phaser.Utils.Array.GetRandom(colors)
      const dot = this.add.circle(x, y, size, color, Phaser.Math.FloatBetween(0.2, 0.7))

      // Cada partícula flota de forma independiente
      this.tweens.add({
        targets: dot,
        y: y - Phaser.Math.Between(20, 60),
        alpha: { from: Phaser.Math.FloatBetween(0.1, 0.5), to: 0 },
        duration: Phaser.Math.Between(2000, 5000),
        delay: Phaser.Math.Between(0, 3000),
        repeat: -1,
        yoyo: false,
        ease: 'Sine.easeIn',
        onRepeat: (tween) => {
          dot.x = Phaser.Math.Between(20, width - 20)
          dot.y = Phaser.Math.Between(height * 0.4, height * 0.85)
          dot.alpha = Phaser.Math.FloatBetween(0.2, 0.6)
        }
      })
    }
  }

  _drawBtn(g, cx, cy, w, h) {
    const r = 10
    // Sombra
    g.fillStyle(0x000000, 0.5)
    g.fillRoundedRect(cx - w / 2 + 3, cy - h / 2 + 4, w, h, r)
    // Borde dorado exterior
    g.fillStyle(0x8a6820, 1)
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, r)
    // Fondo dorado interior
    g.fillGradientStyle(0xf0c84a, 0xe8b830, 0xc9941c, 0xb8820e, 1)
    g.fillRoundedRect(cx - w / 2 + 2, cy - h / 2 + 2, w - 4, h - 4, r - 1)
    // Brillo superior
    g.fillStyle(0xffffff, 0.15)
    g.fillRoundedRect(cx - w / 2 + 4, cy - h / 2 + 3, w - 8, h / 2 - 4, { tl: r - 1, tr: r - 1, bl: 0, br: 0 })
  }

  _addShineLoop(shine, width, btnY, btnW, btnH) {
    const runShine = () => {
      shine.clear()
      shine.setAlpha(0)

      // Faja de brillo diagonal
      shine.fillStyle(0xffffff, 0.25)
      shine.beginPath()
      shine.moveTo(width / 2 - btnW / 2 - 20, btnY - btnH / 2)
      shine.lineTo(width / 2 - btnW / 2 + 15, btnY - btnH / 2)
      shine.lineTo(width / 2 - btnW / 2 - 5, btnY + btnH / 2)
      shine.lineTo(width / 2 - btnW / 2 - 40, btnY + btnH / 2)
      shine.closePath()
      shine.fillPath()

      this.tweens.add({
        targets: shine,
        x: btnW + 60,
        alpha: { from: 0.9, to: 0 },
        duration: 700,
        ease: 'Sine.easeIn',
        delay: 2600,
        onComplete: () => {
          this.time.delayedCall(3500, runShine)
        }
      })
    }
    this.time.delayedCall(2600, runShine)
  }

  startGame() {
    this.cameras.main.fadeOut(500, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene')
    })
  }
}