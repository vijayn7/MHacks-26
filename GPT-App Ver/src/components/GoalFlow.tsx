import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, palettes } from '../design/tokens';
import { useStore } from '../state/Store';
import { money } from '../state/model';
import {
  domainName,
  freshPlan,
  planErrors,
  previewDecision,
  type BlockPlan,
} from '../state/blocking';
import { Icon, QuietButton, Sheet, T } from './ui';
import { useNow } from '../hooks/useNow';

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const titles = [
  'something worth saving for.',
  'make a little space.',
  'on your terms.',
  'a gentler checkout.',
  'your plan, your way.',
];
function Field({
  label,
  value,
  onChange,
  numeric = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <T variant="small">{label}</T>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={(text) => onChange(numeric ? text : text.toLowerCase())}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={s.input}
      />
    </View>
  );
}
function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={[
        s.chip,
        selected && {
          borderColor: palettes.Ember.body + '70',
          backgroundColor: palettes.Ember.body + '12',
        },
      ]}
    >
      <T variant="small" color={selected ? palettes.Ember.core : colors.secondary}>
        {label}
      </T>
    </Pressable>
  );
}
function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      onPress={() => onChange(!value)}
      style={s.toggle}
    >
      <View style={{ flex: 1 }}>
        <T style={{ fontSize: 14 }}>{label}</T>
        {hint && <T variant="small">{hint}</T>}
      </View>
      <View
        style={{
          width: 38,
          height: 24,
          borderRadius: 20,
          backgroundColor: value ? palettes.Ember.core : '#39302A',
          padding: 3,
        }}
      >
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: value ? '#130B07' : colors.secondary,
            alignSelf: value ? 'flex-end' : 'flex-start',
          }}
        />
      </View>
    </Pressable>
  );
}
const numberText = (value: number) => (Number.isFinite(value) ? String(value) : '');
const parseNumber = (text: string) => (text.trim() === '' ? NaN : Number(text));

export function GoalFlow() {
  const { state, dispatch } = useStore();
  const plan = state.plan;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => freshPlan(state.savings));
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const update = (patch: Partial<BlockPlan>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError('');
  };
  const start = () => {
    setDraft(
      plan
        ? { ...plan, domains: [...plan.domains], days: [...plan.days] }
        : freshPlan(state.savings),
    );
    setStep(0);
    setError('');
    setWebsite('');
    setOpen(true);
  };
  const addSite = () => {
    const domain = domainName(website);
    if (!domain) {
      setError('enter a website like amazon.com.');
      return;
    }
    update({ domains: [...new Set([...draft.domains, domain])] });
    setWebsite('');
  };
  const next = () => {
    if (website.trim() && step === 1) {
      setError('add your website before continuing.');
      return;
    }
    const errors = planErrors(draft);
    if (errors[step]) {
      setError(errors[step]!);
      return;
    }
    setError('');
    setStep(step + 1);
  };
  const save = () => {
    const errors = planErrors(draft),
      bad = errors.findIndex(Boolean);
    if (bad >= 0) {
      setStep(bad);
      setError(errors[bad]!);
      return;
    }
    dispatch({ type: 'SAVE_PLAN', plan: { ...draft, title: draft.title.trim().toLowerCase() } });
    setOpen(false);
  };
  const earned = plan ? Math.max(0, state.savings - plan.baselineSavings) : 0;
  return (
    <View testID="home-goal" style={s.section}>
      <T variant="mono" style={{ fontSize: 10 }}>
        a little intention
      </T>
      <T variant="title" style={{ fontSize: 32, marginTop: 9 }}>
        {plan ? plan.title : 'make room for something.'}
      </T>
      <T variant="small" style={{ marginTop: 9, maxWidth: 270 }}>
        {plan
          ? `${money(earned)} of ${money(plan.target)} · ${plan.horizonDays} days`
          : 'choose a goal. let your flame help with the little pauses along the way.'}
      </T>
      {plan && (
        <View style={{ height: 3, backgroundColor: '#FFFFFF12', borderRadius: 3, marginTop: 22 }}>
          <View
            style={{
              height: 3,
              width: `${Math.min(100, (earned / plan.target) * 100)}%`,
              backgroundColor: palettes[state.hue].body,
              borderRadius: 3,
            }}
          />
        </View>
      )}
      <QuietButton onPress={start}>{plan ? 'edit your plan' : 'set a goal'}</QuietButton>
      {plan && (
        <>
          <Toggle
            label="use these rules in preview"
            value={plan.enabled}
            onChange={(enabled) => dispatch({ type: 'PLAN_ENABLED', enabled })}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="test your block"
            onPress={() => setPreview(true)}
            style={s.preview}
          >
            <T variant="small">test your block</T>
            <Icon name="arrow-up-right" size={15} />
          </Pressable>
          <T variant="small" style={{ fontSize: 11, marginTop: 8 }}>
            saved on this device. connect a browser or device blocker to use these rules outside
            snuff.
          </T>
        </>
      )}

      <Sheet visible={open} onClose={() => setOpen(false)} title={titles[step]} contentKey={step}>
        <T
          variant="mono"
          style={{ marginBottom: 20 }}
        >{`0${step + 1} / 05 · ${['goal', 'block', 'schedule', 'response', 'review'][step]}`}</T>
        {step === 0 && (
          <>
            <Field
              label="goal name"
              value={draft.title}
              onChange={(title) => update({ title: title.slice(0, 60) })}
              placeholder="a weekend away"
            />
            <Field
              label="savings goal in dollars"
              numeric
              value={numberText(draft.target)}
              onChange={(v) => update({ target: parseNumber(v) })}
            />
            <T variant="small" style={s.label}>
              give it a little time
            </T>
            <View style={s.choices}>
              {[7, 30, 90].map((days) => (
                <Choice
                  key={days}
                  label={`${days} days`}
                  selected={draft.horizonDays === days}
                  onPress={() => update({ horizonDays: days })}
                />
              ))}
            </View>
            <Field
              label="goal length in days"
              numeric
              value={numberText(draft.horizonDays)}
              onChange={(v) => update({ horizonDays: parseNumber(v) })}
            />
            <T variant="small">new savings count toward your goal from the day you create it.</T>
          </>
        )}
        {step === 1 && (
          <>
            <T variant="small" style={s.label}>
              where do you want a pause?
            </T>
            <View style={s.choices}>
              {['amazon.com', 'etsy.com', 'ebay.com', 'temu.com'].map((domain) => (
                <Choice
                  key={domain}
                  label={domain}
                  selected={draft.domains.includes(domain)}
                  onPress={() =>
                    update({
                      domains: draft.domains.includes(domain)
                        ? draft.domains.filter((d) => d !== domain)
                        : [...draft.domains, domain],
                    })
                  }
                />
              ))}
            </View>
            <Field
              label="another website"
              value={website}
              onChange={setWebsite}
              placeholder="example.com"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="add website"
              onPress={addSite}
              style={s.add}
            >
              <Icon name="plus" size={15} color={palettes.Ember.body} />
              <T variant="small" color={palettes.Ember.body}>
                add website
              </T>
            </Pressable>
            <View style={s.choices}>
              {draft.domains
                .filter((d) => !['amazon.com', 'etsy.com', 'ebay.com', 'temu.com'].includes(d))
                .map((domain) => (
                  <Choice
                    key={domain}
                    label={`remove ${domain}`}
                    selected
                    onPress={() => update({ domains: draft.domains.filter((d) => d !== domain) })}
                  />
                ))}
            </View>
            <Field
              label="pause purchases from this amount"
              numeric
              value={numberText(draft.minAmount)}
              onChange={(v) => update({ minAmount: parseNumber(v) })}
            />
            <T variant="small">
              in dollars. choose 0 for every purchase on these websites, including their subdomains.
            </T>
          </>
        )}
        {step === 2 && (
          <>
            <View style={s.choices}>
              <Choice
                label="any time"
                selected={draft.schedule === 'always'}
                onPress={() => update({ schedule: 'always' })}
              />
              <Choice
                label="quiet hours"
                selected={draft.schedule === 'scheduled'}
                onPress={() => update({ schedule: 'scheduled' })}
              />
            </View>
            {draft.schedule === 'scheduled' && (
              <>
                <T variant="small" style={s.label}>
                  on these days
                </T>
                <View style={s.choices}>
                  {dayNames.map((day, i) => (
                    <Choice
                      key={day}
                      label={day}
                      selected={draft.days.includes(i)}
                      onPress={() =>
                        update({
                          days: draft.days.includes(i)
                            ? draft.days.filter((d) => d !== i)
                            : [...draft.days, i],
                        })
                      }
                    />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 20 }}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="starts at"
                      value={draft.start}
                      onChange={(start) => update({ start })}
                      placeholder="21:00"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="ends at"
                      value={draft.end}
                      onChange={(end) => update({ end })}
                      placeholder="08:00"
                    />
                  </View>
                </View>
                <T variant="small">
                  24-hour time, in your device’s time zone. overnight hours carry into the following
                  morning.
                </T>
              </>
            )}
            {draft.schedule === 'always' && (
              <T variant="small">your rules apply at every checkout you preview, every day.</T>
            )}
          </>
        )}
        {step === 3 && (
          <>
            <View style={s.choices}>
              <Choice
                label="gentle nudge"
                selected={draft.mode === 'nudge'}
                onPress={() => update({ mode: 'nudge' })}
              />
              <Choice
                label="timed pause"
                selected={draft.mode === 'pause'}
                onPress={() => update({ mode: 'pause' })}
              />
            </View>
            {draft.mode === 'pause' ? (
              <>
                <T variant="small" style={s.label}>
                  a little time to think
                </T>
                <View style={s.choices}>
                  {[5, 15, 30, 60].map((minutes) => (
                    <Choice
                      key={minutes}
                      label={`${minutes} min`}
                      selected={draft.cooldownMinutes === minutes}
                      onPress={() => update({ cooldownMinutes: minutes })}
                    />
                  ))}
                </View>
                <Field
                  label="pause length in minutes"
                  numeric
                  value={numberText(draft.cooldownMinutes)}
                  onChange={(v) => update({ cooldownMinutes: parseNumber(v) })}
                />
                <Toggle
                  label="let me continue early"
                  hint="an intentional choice, when you need it"
                  value={draft.allowOverride}
                  onChange={(allowOverride) => update({ allowOverride })}
                />
                {draft.allowOverride && (
                  <Toggle
                    label="ask me for a reason"
                    value={draft.requireReason}
                    onChange={(requireReason) => update({ requireReason })}
                  />
                )}
              </>
            ) : (
              <T variant="small">
                a quiet reminder of your goal, with the choice to continue immediately.
              </T>
            )}
          </>
        )}
        {step === 4 && (
          <>
            {[
              ['your goal', `${draft.title} · ${money(draft.target)} in ${draft.horizonDays} days`],
              [
                'your block',
                `${draft.domains.join(', ')} · purchases from ${money(draft.minAmount)}`,
              ],
              [
                'your schedule',
                draft.schedule === 'always'
                  ? 'every day, any time'
                  : `${draft.days.map((d) => dayNames[d]).join(', ')} · ${draft.start}–${draft.end}`,
              ],
              [
                'your pause',
                draft.mode === 'nudge'
                  ? 'a gentle nudge, no waiting'
                  : `${draft.cooldownMinutes} minutes · ${draft.allowOverride ? (draft.requireReason ? 'continue early with a reason' : 'continue early if needed') : 'wait until the pause ends'}`,
              ],
            ].map(([label, detail], i) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityLabel={`edit ${label}`}
                onPress={() => setStep(i)}
                style={s.review}
              >
                <View style={{ flex: 1 }}>
                  <T variant="small">{label}</T>
                  <T style={{ fontSize: 14, marginTop: 4 }}>{detail}</T>
                </View>
                <Icon name="edit-2" size={14} />
              </Pressable>
            ))}
            <T variant="small" style={{ marginTop: 16 }}>
              save your plan and try it here. website and app blocking outside snuff needs a
              connected blocker.
            </T>
          </>
        )}
        {!!error && (
          <T color={palettes.Ember.body} style={{ fontSize: 13, marginTop: 14 }}>
            {error}
          </T>
        )}
        <QuietButton onPress={step === 4 ? save : next}>
          {step === 4 ? 'save my plan' : 'continue'}
        </QuietButton>
        {step > 0 && (
          <QuietButton
            secondary
            onPress={() => {
              setError('');
              setStep(step - 1);
            }}
          >
            back
          </QuietButton>
        )}
      </Sheet>
      {plan && preview && (
        <BlockPreview
          key={String(preview)}
          plan={plan}
          visible={preview}
          onClose={() => setPreview(false)}
        />
      )}
    </View>
  );
}

function BlockPreview({
  plan,
  visible,
  onClose,
}: {
  plan: BlockPlan;
  visible: boolean;
  onClose: () => void;
}) {
  const [website, setWebsite] = useState(plan.domains[0]);
  const [amount, setAmount] = useState(String(plan.minAmount + 20));
  const [started, setStarted] = useState<number | null>(null);
  const [decision, setDecision] = useState<ReturnType<typeof previewDecision> | null>(null);
  const [reason, setReason] = useState('');
  const [result, setResult] = useState('');
  const now = useNow(1000);
  const remaining =
    started === null
      ? 0
      : Math.min(
          plan.cooldownMinutes * 60,
          Math.max(0, Math.ceil((started + plan.cooldownMinutes * 60000 - now) / 1000)),
        );
  const waiting = !!decision?.matched && plan.mode === 'pause' && remaining > 0;
  const canContinue = !waiting || (plan.allowOverride && (!plan.requireReason || !!reason.trim()));
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="try a little pause."
      expanded
      contentKey={decision ? 'decision' : 'form'}
    >
      <T variant="mono" style={{ marginBottom: 20 }}>
        checkout preview · no purchase is made
      </T>
      {!decision ? (
        <>
          <Field label="preview website" value={website} onChange={setWebsite} />
          <Field label="preview purchase amount" value={amount} onChange={setAmount} numeric />
          <QuietButton
            disabled={
              !domainName(website) ||
              !Number.isFinite(parseNumber(amount)) ||
              parseNumber(amount) < 0
            }
            onPress={() => {
              const at = Date.now();
              setStarted(at);
              setDecision(previewDecision(plan, website, Number(amount), at));
            }}
          >
            preview checkout
          </QuietButton>
        </>
      ) : (
        <>
          <T variant="title" style={{ fontSize: 27 }}>
            {result || decision.reason}
          </T>
          {!result && (
            <>
              {decision.matched && (
                <T variant="small" style={{ marginTop: 12 }}>
                  you’re making room for {plan.title}.
                </T>
              )}
              {waiting && (
                <T variant="title" style={{ marginVertical: 20 }}>
                  {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                </T>
              )}
              {waiting && plan.allowOverride && plan.requireReason && (
                <Field
                  label="why continue now?"
                  value={reason}
                  onChange={setReason}
                  placeholder="this is something i planned for"
                />
              )}
              {waiting && !plan.allowOverride && (
                <T variant="small">
                  you chose to wait. you can always leave this preview or edit your plan.
                </T>
              )}
              <QuietButton
                disabled={!canContinue}
                onPress={() => setResult('preview complete. your choice, made with intention.')}
              >
                continue in preview
              </QuietButton>
              <QuietButton
                secondary
                onPress={() => setResult('a little space, kept. no purchase was made.')}
              >
                leave this purchase
              </QuietButton>
            </>
          )}
          <QuietButton
            secondary
            onPress={() => {
              setDecision(null);
              setStarted(null);
              setResult('');
              setReason('');
            }}
          >
            try another checkout
          </QuietButton>
        </>
      )}
    </Sheet>
  );
}
const s = StyleSheet.create({
  section: {
    paddingTop: 32,
    paddingBottom: 40,
    marginHorizontal: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 17,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFFFFF22',
  },
  label: { marginBottom: 10 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#FFFFFF20',
    minHeight: 44,
  },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    marginBottom: 10,
  },
  preview: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  review: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
