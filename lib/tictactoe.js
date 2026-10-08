class TicTacToe {
    constructor(playerX = 'x', playerO = 'o') {
        this.playerX = playerX
        this.playerO = playerO
        this._currentTurn = false
        this._x = 0
        this._o = 0
        this.turns = 0
    }

    get board() {
        return this._x | this._o
    }

    get currentTurn() {
        return this._currentTurn ? this.playerO : this.playerX
    }

    get enemyTurn() {
        return this._currentTurn ? this.playerX : this.playerO
    }

    static check(state) {
        return (
            (state & 7) === 7 ||
            (state & 56) === 56 ||
            (state & 73) === 73 ||
            (state & 84) === 84 ||
            (state & 146) === 146 ||
            (state & 273) === 273 ||
            (state & 292) === 292 ||
            (state & 448) === 448
        )
    }

    static toBinary(x = 0, y = 0) {
        if (x < 0 || x > 2 || y < 0 || y > 2) {
            throw new Error('invalid position')
        }

        return 1 << (x + 3 * y)
    }

    turn(player = 0, x = 0, y) {
        if (this.board === 511) return -3

        let pos

        if (y == null) {
            if (x < 0 || x > 8) return -1
            pos = 1 << x
        } else {
            if (x < 0 || x > 2 || y < 0 || y > 2) return -1
            pos = 1 << (x + 3 * y)
        }

        if (this._currentTurn ^ player) return -2
        if (this.board & pos) return 0

        if (this._currentTurn) {
            this._o |= pos
        } else {
            this._x |= pos
        }

        this._currentTurn = !this._currentTurn
        this.turns++

        return 1
    }

    static render(boardX = 0, boardO = 0) {
        const result = new Array(9)

        for (let i = 0; i < 9; i++) {
            const mask = 1 << i

            result[i] =
                boardX & mask
                    ? 'X'
                    : boardO & mask
                        ? 'O'
                        : i + 1
        }

        return result
    }

    render() {
        return TicTacToe.render(this._x, this._o)
    }

    get winner() {
        if (TicTacToe.check(this._x)) return this.playerX
        if (TicTacToe.check(this._o)) return this.playerO
        return false
    }
}

export default TicTacToe