/**
 * Client half: a badge at the sidebar foot (`sidebar.footer.action`, root
 * scope), reading `deepseek余额：￥xx.xx`. Visible only when the session
 * bound to the main view (the session open in the right-hand window) has a
 * DeepSeek model selected, and only when the built-in account balance read
 * reports a signed-in account. Balance data comes from the same source as
 * Settings → Account & balance: `remote.account.getBalance` with the client
 * metadata that endpoint expects.
 */
window.__ModuleLoader__.load({
  id: 'deepseek-balance-badge',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useSyncExternalStore, useEffect, useMemo } = React

    const noopSubscribe = () => () => {}
    const SYMBOLS = { CNY: '￥', USD: '$' }
    const POLL_MS = 3 * 60 * 1000

    function formatBalance(amount, currency) {
      const symbol = SYMBOLS[currency] ?? currency + ' '
      const negative = typeof amount === 'string' && amount.trimStart().startsWith('-')
      const digits = String(amount).replace(/[^0-9.]/g, '')
      const [integerRaw = '0', fractionRaw = ''] = digits.split('.')
      const integer = String(Number(integerRaw || '0'))
      const fraction = (fractionRaw + '00').slice(0, 2)
      const grouped = integer === '0' && Number(fraction) === 0
        ? '0.00'
        : `${Number(integer).toLocaleString()}.${fraction}`
      const prefix = negative && !(integer === '0' && Number(fraction) === 0) ? '-' : ''
      return `${prefix}${symbol}${grouped}`
    }

    function isDeepSeekSelection(selection) {
      const next = selection?.next
      if (next === undefined || next === null) return false
      const model = typeof next.model === 'string' ? next.model : ''
      const provider = typeof next.provider === 'string' ? next.provider : ''
      return model.startsWith('deepseek') || provider.startsWith('deepseek')
    }

    function createStore() {
      let value = undefined
      const listeners = new Set()
      return {
        getSnapshot: () => value,
        subscribe: listener => {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        set: next => {
          value = next
          for (const listener of listeners) listener()
        },
      }
    }

    function BalanceBadge({ wide, useSessions, sessions, fetchBalance, balanceStore }) {
      const mainId = useSessions(state => {
        if (state === undefined || state === null) return undefined
        const byId = state.byId ?? {}
        for (const id of state.ids ?? []) {
          const summary = byId[id]
          if (summary !== undefined && summary !== null && ((summary.retainedBy?.mainView ?? 0) > 0)) return id
        }
        return undefined
      })

      const modelFace = useMemo(
        () => (mainId === undefined ? undefined : sessions.binding(mainId)?.session.projections.faceOf('modelSelection')),
        [mainId, sessions],
      )
      const selection = useSyncExternalStore(
        modelFace === undefined ? noopSubscribe : modelFace.subscribe,
        () => (modelFace === undefined ? undefined : modelFace.getSnapshot()),
      )

      const balance = useSyncExternalStore(balanceStore.subscribe, balanceStore.getSnapshot)

      useEffect(() => {
        void fetchBalance()
        const timer = setInterval(() => { void fetchBalance() }, POLL_MS)
        const onFocus = () => { void fetchBalance() }
        window.addEventListener('focus', onFocus)
        return () => {
          clearInterval(timer)
          window.removeEventListener('focus', onFocus)
        }
      }, [fetchBalance])

      const ready = balance?.status === 'ready' && balance.wallets.length > 0
      const deepSeek = isDeepSeekSelection(selection)

      if (!wide) return null
      if (!deepSeek) return null
      if (!ready) return null

      const amount = balance.wallets.map(wallet => formatBalance(wallet.balance, wallet.currency)).join(' ')
      const label = `deepseek余额：${amount}`
      return h('span', {
        title: label,
        'aria-label': label,
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: '999px',
          fontSize: '11px',
          lineHeight: '16px',
          color: 'var(--dsw-alias-label-secondary, inherit)',
          background: 'var(--dsw-alias-fill-tertiary, transparent)',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        },
      }, label)
    }

    return {
      inject: ['slots', 'sessions', 'locale', 'remote', 'remote.account'],
      apply(ctx) {
        const sessions = ctx.sessions
        const balanceStore = createStore()

        const fetchBalance = async () => {
          try {
            const account = ctx.remote?.account
            if (account === undefined || typeof account.getBalance !== 'function') {
              balanceStore.set({ status: 'no-remote' })
              return
            }
            const locale = ctx.get('locale')?.getSnapshot?.().active ?? 'en'
            const bootRelease = window.__DSH_BOOT__?.release
            const version = (typeof bootRelease === 'string' ? bootRelease : bootRelease?.version)
              || (typeof process !== 'undefined' && process.env?.DSH_CLIENT_VERSION)
              || '0.0.0'
            const result = await account.getBalance({
              version,
              locale,
              timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
            })
            if (!result || !result.ok) {
              balanceStore.set({ status: 'failed', detail: result?.error?.message ?? 'no-result' })
              return
            }
            if (result.value === null) {
              balanceStore.set({ status: 'signed-out' })
              return
            }
            if (result.value.status !== 'ready') {
              balanceStore.set({ status: 'unavailable' })
              return
            }
            balanceStore.set({ status: 'ready', wallets: result.value.value })
          } catch (error) {
            balanceStore.set({ status: 'failed', detail: String(error?.message ?? error).slice(0, 300) })
          }
        }

        ctx.on('account-ui/change', () => { void fetchBalance() })
        ctx.on('account-ui/refresh', () => { void fetchBalance() })
        void fetchBalance()

        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'deepseek-balance',
          order: 5,
        }, props => h(BalanceBadge, { ...props, sessions, fetchBalance, balanceStore })))
      },
    }
  },
})
