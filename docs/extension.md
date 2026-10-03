# Chrome extension

Build and load the unpacked extension:

```bash
pnpm --filter @impulse/extension build
```

In `chrome://extensions`, turn on Developer mode and load `apps/extension/.output/chrome-mv3`.

1. Sign in on the phone and open the connection screen. It shows an 8-character code.
2. Open the Impulse popup and enter the code. That creates an extension session. It is not a copy of the phone token.
3. Choose **Allow selected sites**. Chrome asks for those origins only. The extension does not request every website up front.
4. Open a checkout URL on an enabled domain, for example `https://www.amazon.com/checkout` after shopping sites are on.

The content script leaves product pages alone. It looks for checkout, cart, payment, bet slip, and similar paths. It reads the page URL, the title, and a product price meta tag when one exists. It does not read form fields.

The same checkout path will not open the pause twice in a session. If the API is unreachable, the action is queued and retried.

Continue follows the account’s current restriction:

- Low can continue immediately. Holding is optional and can still score a reflection.
- Mid requires the hold, or the “pause without holding” control, or the Space key.
- High asks an accepted trusted contact when that setting is on. The popup polls until the link is answered.

Save for later and Drop it write the same records the phone shows on the next refresh.
