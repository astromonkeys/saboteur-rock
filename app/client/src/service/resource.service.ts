import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { DEFAULT_AVATAR_PATH, DEAD_AVATAR_PATH, DUMMY_PLAYER_NAME, Player, PlayerImg, RoleName } from 'saboteur-lib';
import Roles from '../../../../saboteur-lib/json/roles.json';

const DB_NAME = "Saboteur_Rock_DB";
const DB_VERSION = 3;

@Injectable({
  providedIn: 'root'
})
export class ResourceService extends Dexie {

  private playerImgs!: Table<PlayerImg, string>;
  avatar: Uint8Array = null;

  /* strings */
  get dummyName(): string { return DUMMY_PLAYER_NAME; }
  get emptyAvatar(): string { return DEFAULT_AVATAR_PATH; }
  get deadAvatar(): string { return DEAD_AVATAR_PATH; }
  get localStorageCodeKey(): string { return "existingGameCode"; }
  get localStorageNameKey(): string { return "existingPlayerName"; }
  getCardDescription(role: RoleName): string { return Roles[role].card; }
  get saboteurRockSite(): string { return 'https://www.saboteurrock.com/'; }

  /* colors */
  get stowawayOrange(): string { return '#ff914d'; }
  get turncoatPurple(): string { return '#cb6ce6'; }
  get passengerBlue(): string { return '#38b6ff'; }
  get graphNormal(): string { return '#006064'; }
  get graphElim(): string { return '#c7464e'; }
  get vetoColor(): string { return '#ffe599'; }
  get professorSaboteurColor(): string { return '#8db6fd'; }
  get sosColor(): string { return '#9bcf89'; }
  get silencedColor(): string { return '#ff9090'; }
  get executedColor(): string { return '#ffae61'; }

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      playerImgs: "name"
    });
    this.open()
      .then((data) => this.clearDb())
      .catch((err) => console.error("Dexie DB failed to open:", err.message));
  }

  storePlayerData(code: string, name: string) {
    localStorage.setItem(this.localStorageCodeKey, code);
    localStorage.setItem(this.localStorageNameKey, name);
  }

  clearPlayerData() {
    localStorage.clear();
  }

  setAvatar(dataUrl: string) {
    // convert data URL to uint8 array
    const base64: string = dataUrl.split(',')[1];
    const binary = window.atob(base64);
    const unsigned = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) { unsigned[i] = binary.charCodeAt(i); }
    this.avatar = unsigned;
  }

  async putImage(playerImg: PlayerImg): Promise<void> {
    try {
      await this.playerImgs.put({ name: playerImg.name, img: playerImg.img });
    } catch (err) {
      console.error('putImage failed', err);
    }
  }

  async bulkPutImage(playerImgs: PlayerImg[]) {
    try {
      await this.playerImgs.bulkPut(playerImgs);
    } catch (err) {
      console.error('bulkPutImage failed', err);
    }
  }

  async getImage(playerName: string): Promise<Uint8Array> {
    try {
      let img = await this.playerImgs.get({ name: playerName });
      return img?.img;
    } catch (err) {
      console.error('getImage failed', err);
      return null;
    }
  }

  deleteImage(playerName: string) {
    try {
      this.playerImgs.delete(playerName);
    } catch (err) {
      console.error('deleteImage failed', err);
    }
  }

  async clearDb() {
    await this.playerImgs.clear();
  }

  getRoleIcon(role: RoleName): string {
    return `/client/assets/icons/role_icons/${role}.svg`;
  }

  vetoHTML(): string { return `<b>The president vetoed this vote.</b>`; }
  professorSaboteurHTML(professorSaboteur: boolean): string { return `The professor ${professorSaboteur ? '<b>has</b>' : 'has not'} voted with the Saboteur.`; }
  sosHTML(sos: Player): string { return sos?.name ? `The Satchel of Safety saved... <b>${sos.name}</b>` : `The Satchel of Safety has not been used.`; }
  silencedHTML(silenced: Player): string { return silenced?.name ? `The Silencer has silenced... <b>${silenced.name}</b>` : `No player has been silenced.`; }
  executedHTML(executed: Player, veto: boolean, sos: Player): string {
    if (executed?.name) {
      let fail = veto || sos?.name == executed.name;
      return fail ? `The Executioner attempted to kill... <b>${executed.name}</b>` : `The Executioner has killed... <b>${executed.name}</b>`;
    } else { return `No player has been executed.`; }
  }
}
