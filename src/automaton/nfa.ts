import { uid } from "uid";

// Symbol -- One character input

class NFAState {

  toString() {
    const str = `{${Object.entries(this._inputTransitions).map(([ key, value ]) => {
      return `${key}: ${value}`;
    }).join("\n")}}`;
    return `{
      id: ${this.id},
      isEnd: ${this.isEnd},
      _epsilonTransitions: [${this.epsilonTransitions.map(v => v.toString()).join(",")}],
      inputTransit: ${str},
    }`;
  }

  get epsilonTransitions(): NFAState[] {
    return this._epsilonTransitions;
  }

  set epsilonTransitions(value: NFAState[]) {
    this._epsilonTransitions = value;
  }

  get inputTransitions(): { [ p: string ]: NFAState } {
    return this._inputTransitions;
  }

  set inputTransitions(value: { [ p: string ]: NFAState }) {
    this._inputTransitions = value;
  }

  constructor(
    private _isEnd = false,
    readonly id = uid()
  ) {
  }

  get isEnd(): boolean {
    return this._isEnd;
  }

  set isEnd(value: boolean) {
    this._isEnd = value;
  }

  // public methodは必ずNFA Stateを返す
  findEnd(): NFAState {
    const result = this._findEnd({});
    if (!result) {
      throw new Error("End state should exist");
    }
    return result;
  }

  findById(id: string): NFAState {
    const result = this._findCondition(s => s.id === id, {});
    if (!result) {
      throw new Error("ID should exist");
    }
    return result;
  }

  // 捜査の途中プロセスでは、循環を回避するために途中で探査を中止し、nullを返すこともある
  private _findEnd(visits: { [ K: string ]: boolean }): NFAState | null {
    return this._findCondition((state) => state._isEnd, visits);
  }

  private _findCondition(condition: (state: NFAState) => boolean, visits: { [ K: string ]: boolean }): NFAState | null {
    if (condition(this)) {
      return this;
    }
    if (visits[ this.id ]) return null;
    visits[ this.id ] = true;

    // 最初に発見したEndを返す
    for (const s of this.nextStates()) {
      const end = s._findCondition(condition, visits);
      if (end) {
        return end;
      }
    }
  }

  private nextStates(): NFAState[] {
    return Object.values(this.inputTransitions).concat(this.epsilonTransitions);
  }

  getNextStates(input: string): NFAState[] {
    throw new Error("error");
  }

  private _inputTransitions: { [ K: string ]: NFAState } = {};
  private _epsilonTransitions: NFAState[] = [];

  setTransition(input: string, nextState: NFAState) {
    if (input == "") {
      this._epsilonTransitions.push(nextState);
    } else {
      // 既にあった時は？　とりあえずエラー
      if (this._inputTransitions[ input ]) throw new Error("cannot add more than two state");
      this._inputTransitions[ input ] = nextState;
    }
  }

  deepCopy(visits: { [ K: string ]: boolean } = {}) {
    const copy = new NFAState(this._isEnd, this.id);
    if (visits[ copy.id ]) {
      return copy;
    }
    visits[ this.id ] = true;
    copy._epsilonTransitions = copy._epsilonTransitions.map(t => t.deepCopy(visits));
    const inputTransitions = {};
    Object.entries(this._inputTransitions).forEach(([ key, value ]) => {
      inputTransitions[ key ] = value.deepCopy(visits);
    });
    copy._inputTransitions = inputTransitions;
    return copy;
  }
}

class NFA {
  private start: NFAState;
  // epsilonで移動前のstateリスト
  private currents: NFAState[] = [];

  toString() {
    return `
      start: ${this.start.toString()},
      currents: [${this.currents.map(s => s.toString()).join(",")}]
    `;
  }

  get end() {
    return this.start.findEnd();
  }

  /**
   * From One Length String
   *
   * */
  constructor(private input?: string) {
    // inputが一文字
    // start state
    // transition
    // two state
    if (input != null) {
      const start = new NFAState();
      const end = new NFAState(true);
      start.setTransition(input, end);
      this.start = start;
      this.currents = [ this.start ];
    }
  }


  concat(nfa: NFA) {
    const a = this.deepCopy();
    const b = nfa.deepCopy();
    const end = a.end;
    end.isEnd = false;
    end.setTransition("", b.start);
    return a;
  }

  private get currentMovables() {
    const currentStates: NFAState[] = [];
    const visits: { [ K: string ]: boolean } = {};
    this.currents.forEach(current => {
      if (visits[ current.id ]) return;
      visits[ current.id ] = true;
      currentStates.push(current);
      current.epsilonTransitions.forEach(s => {
        if (visits[ s.id ]) return;
        visits[ s.id ] = true;
        currentStates.push(s);
      });
    });
    return currentStates;
  }

  transit(input: string) {
    const nexts: NFAState[] = [];
    const visits: { [ K: string ]: boolean } = {};
    this.currentMovables.forEach(current => {
      const next = current.inputTransitions[ input ];
      if (next && !visits[ next.id ]) {
        visits[ next.id ] = true;
        nexts.push(next);
      }
    });
    this.currents = nexts;
  }

  private deepCopy() {
    const copy = new NFA();
    copy.start = this.start.deepCopy();
    copy.currents = this.currents.map(s => copy.start.findById(s.id));
    return copy;
  }
}

const a = new NFA("a");
const b = new NFA("b");
const ab = a.concat(b);
ab.transit("a");
ab.transit("b");
console.log(ab.toString());
