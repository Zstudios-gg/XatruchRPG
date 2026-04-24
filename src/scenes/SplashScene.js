import * as Phaser from 'phaser'

export class SplashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SplashScene' })
  }

  preload() {
    this.load.image('bg-splash', '/XatruchRPG/assets/bg-splash.jpg')
    this.load.image('logo-xatruch', '/XatruchRPG/assets/logo-xatruch.png')
    this.load.image('logo-zstudios', '/XatruchRPG/assets/logo-zstudios.png')
  }

  create() {
    const { width, height } = this.scale

    // Fondo
    const bg = this.add.image(width / 2, height / 2, 'bg-splash')
    bg.setDisplaySize(width, height)

    // Overlay oscuro
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45)

    // Logo ZStudios arriba
    const zLogo = this.add.image(width / 2, height * 0.18, 'logo-zstudios')
    zLogo.setDisplaySize(180, 70)
    zLogo.setAlpha(0)

    // Logo Xatruch RPG centro
    const xLogo = this.add.image(width / 2, height * 0.45, 'logo-xatruch')
    xLogo.setDisplaySize(320, 320)
    xLogo.setAlpha(0)

    // Botón jugar
    const btnBg = this.add.rectangle(width / 2, height * 0.78, 200, 52, 0xc9a84c, 1)
    btnBg.setAlpha(0)
    const btnText = this.add.text(width / 2, height * 0.78, '▶  JUGAR', {
      fontSize: '20px',
      color: '#1a1a2e',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0)

    // Texto presentado por
    const presText = this.add.text(width / 2, height * 0.88, 'Presentado por ZStudios', {
      fontSize: '12px',
      color: '#888888'
    }).setOrigin(0.5).setAlpha(0)

    // Animaciones con timeline
    this.tweens.add({
      targets: zLogo,
      alpha: 1,
      y: height * 0.15,
      duration: 800,
      ease: 'Power2',
      delay: 300
    })

    this.tweens.add({
      targets: xLogo,
      alpha: 1,
      y: height * 0.42,
      duration: 1000,
      ease: 'Power2',
      delay: 800
    })

    this.tweens.add({
      targets: [btnBg, btnText],
      alpha: 1,
      duration: 600,
      ease: 'Power2',
      delay: 1600
    })

    this.tweens.add({
      targets: presText,
      alpha: 1,
      duration: 600,
      delay: 1800
    })

    // Pulso en el botón
    this.tweens.add({
      targets: btnBg,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 2200
    })

    // Click o tap en botón jugar
    btnBg.setInteractive()
    btnBg.on('pointerdown', () => this.startGame())
    btnText.setInteractive()
    btnText.on('pointerdown', () => this.startGame())
  }

  startGame() {
    this.cameras.main.fadeOut(500, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene')
    })
  }
}