import * as Phaser from 'phaser'
import { auth, provider } from '../firebase.js'
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth'

/**
 * AuthScene — pantalla de login con Google
 * Se muestra antes del juego si el jugador no está logueado.
 * Si ya está logueado, pasa directo a SplashScene.
 */
export class AuthScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AuthScene' })
  }

  create() {
    const { width, height } = this.scale

    // ── FONDO ──────────────────────────────────────────────────────────────
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x050d05, 0x050d05, 0x0a1a0e, 0x030a06, 1)
    bg.fillRect(0, 0, width, height)

    // Partículas de fondo
    this._buildParticles(width, height)

    // ── LOGO XATRUCH ────────────────────────────────────────────────────────
    if (this.textures.exists('logo-xatruch')) {
      const logo = this.add.image(width / 2, height * 0.28, 'logo-xatruch')
      logo.setDisplaySize(320, 320)
    } else {
      this.add.text(width / 2, height * 0.28, 'XATRUCH RPG', {
        fontSize: '28px',
        color: '#c9a84c',
        fontStyle: 'bold'
      }).setOrigin(0.5)
    }

    // ── TEXTO BIENVENIDA ────────────────────────────────────────────────────
    this.add.text(width / 2, height * 0.52, 'Inicia sesión para guardar\ntu progreso en la nube', {
      fontSize: '13px',
      color: '#aaaaaa',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5)

    // ── BOTÓN GOOGLE ────────────────────────────────────────────────────────
    const btnY  = height * 0.65
    const btnW  = 240
    const btnH  = 50

    // Fondo del botón
    const btnBg = this.add.graphics()
    btnBg.fillStyle(0xffffff, 1)
    btnBg.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 10)

    // Ícono G
    this.add.text(width / 2 - 70, btnY, 'G', {
      fontSize: '20px',
      color: '#4285F4',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    // Texto del botón
    this.add.text(width / 2 + 16, btnY, 'Continuar con Google', {
      fontSize: '13px',
      color: '#333333',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    // Hit area
    const hitBtn = this.add.rectangle(width / 2, btnY, btnW, btnH, 0x000000, 0)
    hitBtn.setInteractive()
    hitBtn.on('pointerover', () => {
      this.tweens.add({ targets: [btnBg], scaleX: 1.03, scaleY: 1.03, duration: 120 })
    })
    hitBtn.on('pointerout', () => {
      this.tweens.add({ targets: [btnBg], scaleX: 1, scaleY: 1, duration: 120 })
    })
    hitBtn.on('pointerdown', () => this._loginGoogle())

    // ── TEXTO DE ESTADO ─────────────────────────────────────────────────────
    this._statusText = this.add.text(width / 2, btnY + 45, '', {
      fontSize: '11px',
      color: '#888888'
    }).setOrigin(0.5)

    // ── TEXTO SKIP (jugar sin cuenta) ───────────────────────────────────────
    const skipText = this.add.text(width / 2, height * 0.82, 'Jugar sin cuenta', {
      fontSize: '12px',
      color: '#555544',
      fontStyle: 'italic'
    }).setOrigin(0.5)
    skipText.setInteractive()
    skipText.on('pointerdown', () => this._goToGame(null))
    skipText.on('pointerover', () => skipText.setColor('#c9a84c'))
    skipText.on('pointerout',  () => skipText.setColor('#555544'))

    // ── VERIFICAR SI YA ESTÁ LOGUEADO ───────────────────────────────────────
    this._statusText.setText('Verificando sesión...')
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // Ya está logueado — va directo al juego
        this._goToGame(user)
      } else {
        this._statusText.setText('')
      }
    })
  }

  async _loginGoogle() {
    this._statusText.setText('Abriendo Google...')
    try {
      const result = await signInWithPopup(auth, provider)
      this._goToGame(result.user)
    } catch (err) {
      console.error(err)
      this._statusText.setText('Error al iniciar sesión. Intentá de nuevo.')
    }
  }

  _goToGame(user) {
    // Guardamos el usuario en el registro global para usarlo en otras escenas
    this.registry.set('user', user)

    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('SplashScene')
    })
  }

  _buildParticles(width, height) {
    for (let i = 0; i < 20; i++) {
      const x     = Phaser.Math.Between(20, width - 20)
      const y     = Phaser.Math.Between(height * 0.2, height * 0.9)
      const size  = Phaser.Math.FloatBetween(1, 2.5)
      const color = Phaser.Utils.Array.GetRandom([0xc9a84c, 0x5aaa5a, 0x88ddaa])
      const dot   = this.add.circle(x, y, size, color, Phaser.Math.FloatBetween(0.2, 0.6))

      this.tweens.add({
        targets: dot,
        y: y - Phaser.Math.Between(20, 50),
        alpha: 0,
        duration: Phaser.Math.Between(2000, 5000),
        delay: Phaser.Math.Between(0, 3000),
        repeat: -1,
        onRepeat: () => {
          dot.x = Phaser.Math.Between(20, width - 20)
          dot.y = Phaser.Math.Between(height * 0.4, height * 0.9)
          dot.alpha = Phaser.Math.FloatBetween(0.2, 0.5)
        }
      })
    }
  }
}