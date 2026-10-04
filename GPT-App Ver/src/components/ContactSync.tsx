import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useStore } from '../state/Store';
import { addContacts, matchesContact } from '../state/contacts';
import { loadContacts, type ContactResult } from '../services/contacts';
import { colors, palettes } from '../design/tokens';
import { Icon, Input, QuietButton, T, tap } from './ui';

export function ContactSync({ onBack }: { onBack: () => void }) {
  const { state, dispatch } = useStore();
  const [result, setResult] = useState<ContactResult | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(50);
  const [added, setAdded] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  const read = () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    return loadContacts(request.signal)
      .then((response) => {
        if (!request.signal.aborted) {
          setResult(response);
          setSelected(new Set());
        }
      })
      .catch(() => {
        if (!request.signal.aborted) setError('contacts couldn’t load. please try again.');
      })
      .finally(() => {
        if (!request.signal.aborted) setBusy(false);
      });
  };
  const refresh = () => {
    setBusy(true);
    setError('');
    void read();
  };
  useEffect(() => {
    void read();
    return () => controller.current?.abort();
  }, []);
  const contacts = result?.status === 'ready' ? result.contacts : [];
  const matching = contacts.filter((c) =>
    `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="use email instead"
        onPress={onBack}
        style={{ minHeight: 44, justifyContent: 'center' }}
      >
        <T variant="small">← use email instead</T>
      </Pressable>
      {added !== null ? (
        <>
          <T variant="title">good company.</T>
          <T variant="small" style={{ marginTop: 12 }}>
            {added} {added === 1 ? 'friend is' : 'friends are'} in your circle.
          </T>
          <QuietButton onPress={onBack}>done</QuietButton>
        </>
      ) : (
        <>
          <T variant="small">
            choose who joins your circle. selected contacts stay on this device. no invitations are
            sent.
          </T>
          {busy ? (
            <T variant="small" style={{ marginTop: 24 }}>
              opening your contacts…
            </T>
          ) : result?.status === 'unsupported' ? (
            <>
              <View style={{ alignItems: 'center', paddingVertical: 30, gap: 14 }}>
                <Icon name="smartphone" size={28} />
                <T style={{ textAlign: 'center' }}>sync from your phone.</T>
                <T variant="small" style={{ textAlign: 'center' }}>
                  open snuff on ios or android to choose from your system contacts. email still
                  works here.
                </T>
              </View>
            </>
          ) : result?.status === 'denied' ? (
            <>
              <T style={{ marginTop: 24 }}>contacts access is off.</T>
              <T variant="small" style={{ marginTop: 8 }}>
                you can allow access in your phone’s settings, or use email.
              </T>
              {result.canAskAgain && <QuietButton onPress={refresh}>try again</QuietButton>}
              <QuietButton
                secondary
                onPress={() =>
                  Linking.openSettings().catch(() =>
                    setError(
                      'couldn’t open settings. open your phone’s settings to allow contacts.',
                    ),
                  )
                }
              >
                open settings
              </QuietButton>
              <QuietButton secondary onPress={refresh}>
                check access again
              </QuietButton>
            </>
          ) : result?.status === 'ready' ? (
            <>
              {result.limited && (
                <T variant="small" style={{ marginTop: 16 }}>
                  showing the contacts you allowed. you can change access in settings.
                </T>
              )}
              {!contacts.length ? (
                <T style={{ marginTop: 24 }}>
                  no contacts with an email or phone number are available.
                </T>
              ) : (
                <>
                  <Input
                    label="search contacts"
                    placeholder="search your contacts"
                    value={query}
                    onChangeText={(v) => {
                      setQuery(v);
                      setLimit(50);
                    }}
                  />
                  {matching.slice(0, limit).map((c) => {
                    const existing = state.friends.some((f) => matchesContact(f, c));
                    const checked = existing || selected.has(c.id);
                    return (
                      <Pressable
                        key={c.id}
                        accessibilityRole="checkbox"
                        accessibilityLabel={`select ${c.name.toLowerCase()}`}
                        accessibilityState={{ checked, disabled: existing }}
                        aria-checked={checked}
                        disabled={existing}
                        onPress={() => {
                          tap();
                          setSelected((current) => {
                            const next = new Set(current);
                            if (next.has(c.id)) next.delete(c.id);
                            else next.add(c.id);
                            return next;
                          });
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          paddingVertical: 13,
                          minHeight: 60,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: '#FFFFFF09',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <T variant="small">{c.name.slice(0, 1)}</T>
                        </View>
                        <View style={{ flex: 1 }}>
                          <T>{c.name}</T>
                          <T variant="small">
                            {existing ? 'already in your circle' : c.email || c.phone}
                          </T>
                        </View>
                        <Icon
                          name={checked ? 'check-circle' : 'circle'}
                          color={checked ? palettes[state.hue].body : colors.muted}
                          size={20}
                        />
                      </Pressable>
                    );
                  })}
                  {!matching.length && (
                    <T variant="small" style={{ paddingVertical: 20 }}>
                      no matching contacts.
                    </T>
                  )}
                  {matching.length > limit && (
                    <QuietButton secondary onPress={() => setLimit(limit + 50)}>
                      show more contacts
                    </QuietButton>
                  )}
                  <QuietButton
                    disabled={!selected.size}
                    onPress={() => {
                      const chosen = contacts.filter(
                        (c) =>
                          selected.has(c.id) && !state.friends.some((f) => matchesContact(f, c)),
                      );
                      dispatch({ type: 'CONNECT_CONTACTS', contacts: chosen });
                      setAdded(addContacts(state.friends, chosen).length - state.friends.length);
                      setSelected(new Set());
                      setResult(null);
                    }}
                  >
                    {`add ${selected.size || ''} ${selected.size === 1 ? 'friend' : 'friends'}`.replace(
                      '  ',
                      ' ',
                    )}
                  </QuietButton>
                </>
              )}
              <QuietButton secondary onPress={refresh}>
                refresh contacts
              </QuietButton>
            </>
          ) : null}
          {!!error && (
            <>
              <T variant="small" color={palettes.Crimson.body} style={{ marginTop: 18 }}>
                {error}
              </T>
              <QuietButton secondary onPress={refresh}>
                try again
              </QuietButton>
            </>
          )}
        </>
      )}
    </View>
  );
}
