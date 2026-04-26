import * as Phaser from 'phaser'
import { auth } from '../firebase.js'
import { signOut } from 'firebase/auth'

export class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HUDScene' })
    this._hp    = 100
    this._hpMax = 100
    this._gold  = 0
    this._level = 1
    this._xp    = 0
    this._xpMax = 100
    this._gems  = 0
    this._panelOpen    = false
    this._settingsOpen = false
    this._panelTween   = null
    this._settingsTween = null
  }

  create() {
    const { width } = this.scale

    this._hudBg = this.add.graphics()
    this._drawHudBg(width)

    const barX = 14
    const barY = 10
    const barW = width * 0.52
    const barH = 14

    this.add.text(barX, barY - 1, '❤', { fontSize: '13px' })

    this._hpBarBg = this.add.graphics()
    this._hpBarBg.fillStyle(0x1a0808, 1)
    this._hpBarBg.fillRoundedRect(barX + 20, barY, barW, barH, 6)

    this._hpBar = this.add.graphics()

    this._hpText = this.add.text(barX + 20 + barW / 2, barY + barH / 2, `${this._hp}/${this._hpMax}`, {
      fontSize: '9px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5)

    this._barX = barX + 20
    this._barY = barY
    this._barW = barW
    this._barH = barH

    this._goldText = this.add.text(barX + 20, barY + barH + 7, '🪙 0', {
      fontSize: '11px', color: '#f0c84a',
      stroke: '#000000', strokeThickness: 2
    })

    // ── BOTÓN STATS (👤) ─────────────────────────────────────────────────
    const btnSize = 34
    const btnX    = width - btnSize / 2 - 10
    const btnY    = 20

    this._statsBtnBg = this.add.graphics()
    this._drawStatsBtn(btnX, btnY, btnSize, false)
    this._statsBtnIcon = this.add.text(btnX, btnY, '👤', { fontSize: '16px' }).setOrigin(0.5)

    const hitBtn = this.add.rectangle(btnX, btnY, btnSize, btnSize, 0x000000, 0)
    hitBtn.setInteractive()
    hitBtn.on('pointerdown', () => this._togglePanel())

    // ── BOTÓN SETTINGS (⚙️) a la izquierda del de perfil ────────────────
    const settBtnX = width - btnSize / 2 - 10 - btnSize - 8
    const settBtnY = 20

    this._settBtnBg = this.add.graphics()
    this._drawSettBtn(settBtnX, settBtnY, btnSize, false)
    this._settBtnIcon = this.add.text(settBtnX, settBtnY, '⚙️', { fontSize: '16px' }).setOrigin(0.5)

    const hitSett = this.add.rectangle(settBtnX, settBtnY, btnSize, btnSize, 0x000000, 0)
    hitSett.setInteractive()
    hitSett.on('pointerdown', () => this._toggleSettings(settBtnX, settBtnY, btnSize))

    // ── PANELS ───────────────────────────────────────────────────────────
    this._buildStatsPanel(width)
    this._buildSettingsPanel(width)

    this._redrawHP()
    this._redrawGold()
    this._redrawPanel()
  }

  // ── API PÚBLICA ───────────────────────────────────────────────────────────

  setHP(val)    { this._hp = Phaser.Math.Clamp(val, 0, this._hpMax); this._redrawHP() }
  setHPMax(val) { this._hpMax = val; this._redrawHP() }
  setGold(val)  { this._gold = val; this._redrawGold() }
  setStats({ level, xp, xpMax, gems } = {}) {
    if (level !== undefined) this._level = level
    if (xp    !== undefined) this._xp    = xp
    if (xpMax !== undefined) this._xpMax = xpMax
    if (gems  !== undefined) this._gems  = gems
    this._redrawPanel()
  }

  // ── INTERNOS ──────────────────────────────────────────────────────────────

  _drawHudBg(width) {
    this._hudBg.clear()
    this._hudBg.fillStyle(0x000000, 0.45)
    this._hudBg.fillRoundedRect(6, 4, width - 12, 52, 8)
    this._hudBg.lineStyle(1, 0xc9a84c, 0.25)
    this._hudBg.strokeRoundedRect(6, 4, width - 12, 52, 8)
  }

  _redrawHP() {
    this._hpBar.clear()
    const pct   = this._hp / this._hpMax
    const color = pct > 0.5 ? 0x44cc44 : pct > 0.25 ? 0xddaa22 : 0xcc2222
    const fillW = Math.max(0, (this._barW - 4) * pct)
    this._hpBar.fillStyle(color, 1)
    this._hpBar.fillRoundedRect(this._barX + 2, this._barY + 2, fillW, this._barH - 4, 4)
    this._hpBar.fillStyle(0xffffff, 0.15)
    this._hpBar.fillRoundedRect(this._barX + 2, this._barY + 2, fillW, (this._barH - 4) / 2, { tl: 4, tr: 4, bl: 0, br: 0 })
    this._hpText.setText(`${this._hp}/${this._hpMax}`)
  }

  _redrawGold() { this._goldText.setText(`🪙 ${this._gold}`) }

  _drawStatsBtn(x, y, size, active) {
    this._statsBtnBg.clear()
    this._statsBtnBg.fillStyle(active ? 0xc9a84c : 0x1a1a3a, 0.9)
    this._statsBtnBg.fillRoundedRect(x - size / 2, y - size / 2, size, size, 7)
    this._statsBtnBg.lineStyle(1, 0xc9a84c, active ? 1 : 0.4)
    this._statsBtnBg.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 7)
  }

  _drawSettBtn(x, y, size, active) {
    this._settBtnBg.clear()
    this._settBtnBg.fillStyle(active ? 0x5a5aaa : 0x1a1a3a, 0.9)
    this._settBtnBg.fillRoundedRect(x - size / 2, y - size / 2, size, size, 7)
    this._settBtnBg.lineStyle(1, 0x8888cc, active ? 1 : 0.4)
    this._settBtnBg.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 7)
  }

  _buildStatsPanel(width) {
    const panelW = width - 20
    const panelH = 160
    const panelX = 10
    this._panelY = -panelH - 10
    this._panelContainer = this.add.container(0, this._panelY)

    const panelBg = this.add.graphics()
    panelBg.fillStyle(0x0a0a1e, 0.96)
    panelBg.fillRoundedRect(panelX, 62, panelW, panelH, 10)
    panelBg.lineStyle(1, 0xc9a84c, 0.5)
    panelBg.strokeRoundedRect(panelX, 62, panelW, panelH, 10)

    const title = this.add.text(width / 2, 76, 'ESTADÍSTICAS', {
      fontSize: '10px', color: '#c9a84c', letterSpacing: 4
    }).setOrigin(0.5)

    const sep = this.add.graphics()
    sep.lineStyle(1, 0xc9a84c, 0.3)
    sep.lineBetween(panelX + 12, 90, panelX + panelW - 12, 90)

    this._txtLevel = this.add.text(panelX + 16, 100, '', { fontSize: '12px', color: '#ffffff' })
    this._txtXP    = this.add.text(panelX + 16, 120, '', { fontSize: '11px', color: '#aaaaff' })
    this._txtGems  = this.add.text(panelX + 16, 140, '', { fontSize: '11px', color: '#dd88ff' })

    this._xpBarBg = this.add.graphics()
    this._xpBarBg.fillStyle(0x111133, 1)
    this._xpBarBg.fillRoundedRect(panelX + 16, 133, panelW - 32, 8, 4)

    this._xpBar = this.add.graphics()

    this._panelContainer.add([panelBg, title, sep,
      this._txtLevel, this._txtXP, this._txtGems,
      this._xpBarBg, this._xpBar])
    this._panelContainer.setAlpha(0)
  }

  _buildSettingsPanel(width) {
    const panelW = width - 20
    const panelX = 10

    this._settingsContainer = this.add.container(0, -300)

    const bg = this.add.graphics()
    bg.fillStyle(0x0a0a1e, 0.97)
    bg.fillRoundedRect(panelX, 62, panelW, 180, 10)
    bg.lineStyle(1, 0x8888cc, 0.5)
    bg.strokeRoundedRect(panelX, 62, panelW, 180, 10)

    const title = this.add.text(width / 2, 76, 'CONFIGURACIÓN', {
      fontSize: '10px', color: '#8888cc', letterSpacing: 4
    }).setOrigin(0.5)

    const sep = this.add.graphics()
    sep.lineStyle(1, 0x8888cc, 0.3)
    sep.lineBetween(panelX + 12, 90, panelX + panelW - 12, 90)

    // ── Botón cerrar sesión ──────────────────────────────────────────────
    const user = this.registry.get('user')
    const isGuest = !user

    const logoutBg = this.add.graphics()
    logoutBg.fillStyle(0x3a1a1a, 1)
    logoutBg.fillRoundedRect(panelX + 16, 105, panelW - 32, 38, 8)
    logoutBg.lineStyle(1, 0xcc4444, 0.8)
    logoutBg.strokeRoundedRect(panelX + 16, 105, panelW - 32, 38, 8)

    const logoutText = this.add.text(width / 2, 124, isGuest ? '🔑  Iniciar sesión' : '🚪  Cerrar sesión', {
      fontSize: '13px', color: isGuest ? '#44cc88' : '#cc4444', fontStyle: 'bold'
    }).setOrigin(0.5)

    const logoutHit = this.add.rectangle(width / 2, 124, panelW - 32, 38, 0x000000, 0)
    logoutHit.setInteractive()
    logoutHit.on('pointerdown', () => {
      if (isGuest) {
        this._closeSettings()
        this.cameras.main.fadeOut(400, 0, 0, 0)
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.stop('HUDScene')
          this.scene.stop('GameScene')
          this.scene.start('AuthScene')
        })
      } else {
        signOut(auth).then(() => {
          this._closeSettings()
          this.cameras.main.fadeOut(400, 0, 0, 0)
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.stop('HUDScene')
            this.scene.stop('GameScene')
            this.scene.start('AuthScene')
          })
        })
      }
    })

    // ── Botón jugar sin cuenta (solo si hay sesión) ──────────────────────
    if (!isGuest) {
      const guestBg = this.add.graphics()
      guestBg.fillStyle(0x1a1a3a, 1)
      guestBg.fillRoundedRect(panelX + 16, 153, panelW - 32, 34, 8)
      guestBg.lineStyle(1, 0x555588, 0.6)
      guestBg.strokeRoundedRect(panelX + 16, 153, panelW - 32, 34, 8)

      const guestText = this.add.text(width / 2, 170, '👻  Jugar sin cuenta', {
        fontSize: '12px', color: '#888888', fontStyle: 'italic'
      }).setOrigin(0.5)

      const guestHit = this.add.rectangle(width / 2, 170, panelW - 32, 34, 0x000000, 0)
      guestHit.setInteractive()
      guestHit.on('pointerdown', () => {
        this.registry.set('user', null)
        this._closeSettings()
        this.cameras.main.fadeOut(300, 0, 0, 0)
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.stop('HUDScene')
          this.scene.restart()
        })
      })

      this._settingsContainer.add([bg, title, sep, logoutBg, logoutText, logoutHit, guestBg, guestText, guestHit])
    } else {
      this._settingsContainer.add([bg, title, sep, logoutBg, logoutText, logoutHit])
    }

    this._settingsContainer.setAlpha(0)
  }

  _redrawPanel() {
    if (!this._txtLevel) return
    const { width } = this.scale
    const panelW = width - 20
    const panelX = 10
    const pct    = Phaser.Math.Clamp(this._xp / this._xpMax, 0, 1)
    const fillW  = (panelW - 32) * pct

    this._txtLevel.setText(`⚔️  Nivel  ${this._level}`)
    this._txtXP.setText(`✨ XP  ${this._xp} / ${this._xpMax}`)
    this._txtGems.setText(`💎 Gemas cosméticas:  ${this._gems}`)

    this._xpBar.clear()
    this._xpBar.fillStyle(0x4455ff, 1)
    this._xpBar.fillRoundedRect(panelX + 16, 133, fillW, 8, 4)
  }

  _togglePanel() {
    const { width } = this.scale
    const btnSize = 34
    const btnX    = width - btnSize / 2 - 10
    const btnY    = 20

    if (this._settingsOpen) this._closeSettings()
    if (this._panelTween) this._panelTween.stop()

    if (!this._panelOpen) {
      this._panelOpen = true
      this._drawStatsBtn(btnX, btnY, btnSize, true)
      this._panelContainer.setAlpha(1)
      this._panelContainer.y = -200
      this._panelTween = this.tweens.add({
        targets: this._panelContainer, y: 0, duration: 280, ease: 'Back.Out'
      })
    } else {
      this._panelOpen = false
      this._drawStatsBtn(btnX, btnY, btnSize, false)
      this._panelTween = this.tweens.add({
        targets: this._panelContainer, y: -200, duration: 220, ease: 'Power2.In',
        onComplete: () => this._panelContainer.setAlpha(0)
      })
    }
  }

  _toggleSettings(settBtnX, settBtnY, btnSize) {
    if (this._panelOpen) this._togglePanel()

    if (!this._settingsOpen) {
      this._settingsOpen = true
      this._drawSettBtn(settBtnX, settBtnY, btnSize, true)
      this._settingsContainer.setAlpha(1)
      this._settingsContainer.y = -300
      this._settingsTween = this.tweens.add({
        targets: this._settingsContainer, y: 0, duration: 280, ease: 'Back.Out'
      })
    } else {
      this._closeSettings()
    }
  }

  _closeSettings() {
    const { width } = this.scale
    const btnSize   = 34
    const settBtnX  = width - btnSize / 2 - 10 - btnSize - 8
    const settBtnY  = 20

    this._settingsOpen = false
    this._drawSettBtn(settBtnX, settBtnY, btnSize, false)
    if (this._settingsTween) this._settingsTween.stop()
    this._settingsTween = this.tweens.add({
      targets: this._settingsContainer, y: -300, duration: 220, ease: 'Power2.In',
      onComplete: () => this._settingsContainer.setAlpha(0)
    })
  }
}