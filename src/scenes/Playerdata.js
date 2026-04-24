import { db } from '../firebase.js'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

/**
 * PlayerData — maneja el guardado y cargado del progreso en Firestore
 *
 * Uso desde GameScene:
 *   import { PlayerData } from './PlayerData.js'
 *
 *   // Cargar al inicio:
 *   this.playerData = new PlayerData(user.uid)
 *   await this.playerData.load()
 *
 *   // Guardar cambios:
 *   this.playerData.set('gold', 150)
 *   await this.playerData.save()
 */

// Valores por defecto para un jugador nuevo
const DEFAULT_DATA = {
  // Identidad
  uid:        '',
  name:       'Aventurero',

  // Stats
  level:      1,
  xp:         0,
  xpMax:      100,
  hp:         100,
  hpMax:      100,

  // Monedas
  gold:       0,
  gems:       0,

  // Progreso
  zone:       'lago_yojoa',
  chapter:    1,
  posX:       0,
  posY:       0,

  // Logros y habilidades
  achievements: [],
  skills:       [],

  // Cosmético
  appearance: {
    gender:    'male',
    skinColor: 0,
    hairColor: 0,
    outfit:    'default'
  },

  // Multijugador (inactivo por ahora)
  visible_online: false,

  // Metadata
  createdAt:  null,
  lastSeen:   null
}

export class PlayerData {
  constructor(uid) {
    this.uid  = uid
    this.data = { ...DEFAULT_DATA, uid }
    this._dirty = false // true cuando hay cambios sin guardar
  }

  // ── CARGAR DESDE FIRESTORE ──────────────────────────────────────────────
  async load() {
    try {
      const ref  = doc(db, 'players', this.uid)
      const snap = await getDoc(ref)

      if (snap.exists()) {
        // Jugador existente — mezclamos con defaults para campos nuevos
        this.data = { ...DEFAULT_DATA, ...snap.data(), uid: this.uid }
        console.log('[PlayerData] Progreso cargado:', this.data.name)
      } else {
        // Jugador nuevo — creamos su documento
        this.data.createdAt = new Date().toISOString()
        this.data.lastSeen  = new Date().toISOString()
        await setDoc(ref, this.data)
        console.log('[PlayerData] Jugador nuevo creado')
      }
    } catch (err) {
      console.error('[PlayerData] Error al cargar:', err)
    }
    return this.data
  }

  // ── GUARDAR EN FIRESTORE ────────────────────────────────────────────────
  async save() {
    try {
      this.data.lastSeen = new Date().toISOString()
      const ref = doc(db, 'players', this.uid)
      await updateDoc(ref, this.data)
      this._dirty = false
      console.log('[PlayerData] Progreso guardado')
    } catch (err) {
      console.error('[PlayerData] Error al guardar:', err)
    }
  }

  // ── GUARDADO AUTOMÁTICO CADA X SEGUNDOS ────────────────────────────────
  // Llamar desde GameScene.create():
  //   this.playerData.startAutoSave(this, 30000) // cada 30 segundos
  startAutoSave(scene, intervalMs = 30000) {
    scene.time.addEvent({
      delay: intervalMs,
      loop: true,
      callback: () => {
        if (this._dirty) this.save()
      }
    })
    console.log(`[PlayerData] AutoSave cada ${intervalMs / 1000}s activado`)
  }

  // ── GETTERS Y SETTERS ───────────────────────────────────────────────────
  get(key) {
    return this.data[key]
  }

  set(key, value) {
    this.data[key] = value
    this._dirty = true
  }

  // Subir XP con lógica de nivel
  addXP(amount) {
    this.data.xp += amount
    this._dirty = true

    // Level up
    while (this.data.xp >= this.data.xpMax) {
      this.data.xp    -= this.data.xpMax
      this.data.level += 1
      this.data.xpMax  = Math.floor(this.data.xpMax * 1.4) // cada nivel cuesta más
      this.data.hpMax += 10
      this.data.hp     = this.data.hpMax // se cura al subir de nivel
      console.log(`[PlayerData] ¡Nivel ${this.data.level}!`)
    }

    return this.data.level
  }

  // Agregar oro
  addGold(amount) {
    this.data.gold += amount
    this._dirty = true
  }

  // Gastar oro (devuelve false si no alcanza)
  spendGold(amount) {
    if (this.data.gold < amount) return false
    this.data.gold -= amount
    this._dirty = true
    return true
  }

  // Recibir daño
  takeDamage(amount) {
    this.data.hp = Math.max(0, this.data.hp - amount)
    this._dirty = true
    return this.data.hp
  }

  // Curar
  heal(amount) {
    this.data.hp = Math.min(this.data.hpMax, this.data.hp + amount)
    this._dirty = true
    return this.data.hp
  }

  // Guardar posición actual
  savePosition(x, y) {
    this.data.posX  = Math.round(x)
    this.data.posY  = Math.round(y)
    this._dirty = true
  }
}
//XDD