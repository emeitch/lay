import { v } from './val';
import UUID from './uuid';
import Note from './note';
import Obj from './obj';
import { assign, transaction, transactionTime, invalidate } from './ontology';

export default class Book {
  constructor(parent=undefined) {
    this.parent = parent;
    this.notes = new Map();
    this.activeNotesCache = new Map();
    this.invalidationNotesCache = new Map();
  }

  note(noteid) {
    return this.notes.get(noteid);
  }

  findNotes(cond) {
    const notes = [];

    // todo: 線形探索になっているので高速化する
    for (const [, note] of this.notes) {
      const keys = Object.keys(cond);
      if (keys.every((k) => JSON.stringify(note[k]) === JSON.stringify(cond[k]))) {
        notes.push(note);
      }
    }

    return notes;
  }

  cacheIndex(id, key) {
    return id + "__" + key;
  }

  activeNotes(id, key, at=new Date()) {
    const i = this.cacheIndex(id, key);
    const anotes = new Map(this.activeNotesCache.get(i));
    const inotes = new Map(this.invalidationNotesCache.get(i));

    for (let [, note] of anotes) {
      if (note.at && note.at > at) {
        anotes.delete(note.noteid);
      }
    }

    for (let [, inote] of inotes) {
      const note = anotes.get(inote.id);
      if (note && (!inote.at || inote.at <= at)) {
        anotes.delete(note.noteid);
      }
    }

    const actives = Array.from(anotes.values()).sort((a, b) => {
      if (a.at === undefined) {
        return -1;
      } else if (b.at === undefined) {
        return 1;
      } else {
        return a.at.getTime() - b.at.getTime();
      }
    });

    if (actives.length > 0) {
      return actives;
    }

    if (this.parent) {
      return this.parent.activeNotes(id, key, at);
    }

    return [];
  }

  activeNote(id, key, at=new Date()) {
    const actives = this.activeNotes(id, key, at);
    return actives[actives.length-1];
  }

  obj(id) {
    return new Obj(this, id);
  }

  transactionObj(note) {
    const tnotes = this.findNotes({id: note.noteid, key: transaction});

    if (tnotes.length === 0) {
      return undefined;
    }

    const tnote = tnotes[0];
    const tid = tnote.val;
    return this.obj(tid);
  }

  resolve(name) {
    const notes = this.findNotes({id: v(name), key: assign});
    const note = notes[notes.length-1];
    if (note) {
      return note.val;
    }

    if (this.parent) {
      return this.parent.resolve(name);
    }

    return undefined;
  }

  assign(name, id) {
    // todo: ユニーク制約をかけたい
    const note = new Note(v(name), assign, id);
    this.put(note);
  }

  syncCache(note) {
    const i = this.cacheIndex(note.id, note.key);
    const al = this.activeNotesCache.get(i) || new Map();
    al.set(note.noteid, note);
    this.activeNotesCache.set(i, al);

    if (note.key === invalidate) {
      const positive = this.note(note.id);
      const i = this.cacheIndex(positive.id, positive.key);
      const il = this.invalidationNotesCache.get(i) || new Map();
      il.set(note.noteid, note);
      this.invalidationNotesCache.set(i, il);
    }
  }

  doTransaction(block) {
    // todo: アトミックな操作に修正する
    const appendNote = (note) => {
      this.notes.set(note.noteid, note);
      this.syncCache(note);
    };
    const tid = new UUID();
    const ttnote = new Note(tid, transactionTime, v(new Date()));

    appendNote(ttnote);

    const putWithTransaction = (note) => {
      appendNote(note);
      const tnote = new Note(note.noteid, transaction, tid);
      appendNote(tnote);
      return note;
    };
    return block(putWithTransaction);
  }

  put(note) {
    return this.doTransaction(putWithTransaction => {
      return putWithTransaction(note);
    });
  }
}
