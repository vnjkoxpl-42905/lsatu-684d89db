import { useId, useState } from 'react';

const rooms = [
  { film: true, workshop: false, label: 'Film showing. No workshop.' },
  { film: false, workshop: false, label: 'No film. No workshop.' },
  { film: true, workshop: true, label: 'Film showing. Workshop underway.' },
];

export function NegativeCaseLab() {
  const [selected, setSelected] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [workshopAnswer, setWorkshopAnswer] = useState<boolean | null>(null);
  const id = useId();
  const correct = selected.length === 2 && selected.includes(0) && selected.includes(1);
  return <div className="co-negative-lab">
    <p>Let's take the same reasoning into a sentence whose required condition contains a negative. Accept this rule for the exercise:</p>
    <blockquote>If a room is showing a film, it is not hosting a workshop.</blockquote>
    <p>Use <strong>F</strong> for showing a film and <strong>W</strong> for hosting a workshop. Our rule is <strong>F → ~W</strong>. A film requires the absence of a workshop. We haven't said a film is the only reason a room might have no workshop.</p>
    <div className="co-given-fact"><span className="co-kicker">Given fact</span><strong>This room is not hosting a workshop: ~W.</strong></div>
    <h3 id={id}>Which possible rooms fit both the rule and that fact? Select every one that fits.</h3>
    <div className="co-room-options" role="group" aria-labelledby={id}>{rooms.map((room, index) => <button type="button" key={room.label} aria-pressed={selected.includes(index)} onClick={() => { setSelected(items => items.includes(index) ? items.filter(i => i !== index) : [...items, index]); setChecked(false); }}><span className="co-room-drawing" aria-hidden="true"><i data-lit={room.film}/><b data-active={room.workshop}>W</b></span><span>{room.label}</span></button>)}</div>
    <button type="button" className="co-primary" disabled={selected.length === 0} onClick={() => setChecked(true)}>Check these possibilities</button>
    <div role="status">{checked && <div className="co-feedback"><strong>{correct ? 'Both film possibilities remain open.' : selected.includes(2) ? 'A workshop conflicts with the given fact.' : 'There is another case that fits.'}</strong><p>{selected.includes(2) ? "The fact says no workshop. A film and a workshop would also break the original rule. Remove that room, then check the others." : "A film with no workshop fits. No film with no workshop fits too. Both keep the rule true and satisfy the given fact, so ~W establishes neither F nor ~F. We know there is no workshop; we don't know whether there is a film."}</p></div>}</div>
    {checked && correct && <div className="co-case-takeaway"><h3>Change the fact: now a workshop is underway.</h3><p>The rule stays F → ~W. Could this room also be showing a film?</p><div className="co-choices"><button type="button" aria-pressed={workshopAnswer === true} onClick={() => setWorkshopAnswer(true)}>Yes, it could.</button><button type="button" aria-pressed={workshopAnswer === false} onClick={() => setWorkshopAnswer(false)}>No, it could not.</button></div><div role="status">{workshopAnswer !== null && <p>{workshopAnswer ? "A film would require no workshop. That conflicts with our new fact that a workshop is underway, so a film is ruled out." : "A film would require no workshop, but a workshop is underway. That rules out a film. In symbols, W → ~F. Negating ~W gives W, which is why this is the contrapositive."}</p>}</div></div>}
  </div>;
}

const comparisons = [
  { sentence: 'Only stamped envelopes go into the dispatch tray.', same: true, reason: 'Only makes a stamp necessary for an envelope in the tray. An envelope in the tray must be stamped. A stamped envelope can still be elsewhere.' },
  { sentence: 'An envelope goes into the dispatch tray if it is stamped.', same: false, reason: 'If now makes the stamp sufficient for going into the tray. This sends every stamped envelope there. The original rule allowed stamped envelopes elsewhere.' },
  { sentence: 'The only envelopes in the dispatch tray are stamped envelopes.', same: true, reason: 'The only refers to envelopes in the tray. Being in the tray is enough to establish a stamp, just as in the original rule.' },
  { sentence: 'An envelope goes into the dispatch tray only if it is stamped.', same: true, reason: 'Only if makes being stamped a requirement for going into the tray. It does not promise a place in the tray to every stamped envelope.' },
];

export function RuleComparisonLab() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [explain, setExplain] = useState(false);
  const question = useId();
  const item = comparisons[index];
  const answer = answers[index];
  return <div className="co-comparison-lab">
    <p>You now know both groups. Set the group names aside and read what each sentence promises.</p>
    <p className="co-kicker">Keep this original rule</p><blockquote>Every envelope in the dispatch tray is stamped.</blockquote>
    <p>An envelope in the tray has to be stamped. A stamped envelope could still be elsewhere. Use that possible case to check each new version.</p>
    <div className="co-word-tabs" role="group" aria-label="Wording variations">{comparisons.map((_, i) => <button type="button" key={i} aria-pressed={index === i} onClick={() => { setIndex(i); setExplain(false); }}>Version {i + 1}</button>)}</div>
    <blockquote>{item.sentence}</blockquote><h3 id={question}>Does this preserve the original rule, or reverse it?</h3>
    <div className="co-choices" role="group" aria-labelledby={question}><button type="button" aria-pressed={answer === true} onClick={() => setAnswers({ ...answers, [index]: true })}>Same rule</button><button type="button" aria-pressed={answer === false} onClick={() => setAnswers({ ...answers, [index]: false })}>Reversed rule</button></div>
    <div role="status">{answer !== undefined && <div className="co-feedback"><strong>{answer === item.same ? 'The meaning matches your choice.' : 'Read the starting condition again.'}</strong><p>{item.reason}</p></div>}</div>
    {Object.keys(answers).length === comparisons.length && <div className="co-case-takeaway"><h3>One word can change what follows</h3><p>Compare versions 2 and 4. Before opening the explanation, say what adding only did to the role of the stamp.</p><button type="button" aria-expanded={explain} onClick={() => setExplain(!explain)}>Compare if with only if</button>{explain && <p>If makes the stamp enough for going into the tray. Only if makes it required for going into the tray. The stamp moved from the sufficient role to the necessary role. That's why reading the complete expression matters.</p>}</div>}
  </div>;
}

// Original application of the Demon clips' concrete-to-abstract and case-testing approach.
export function CounterexampleLab() {
  const [drawer, setDrawer] = useState<boolean | null>(null);
  const [border, setBorder] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);
  const [found, setFound] = useState(false);
  const id = useId();
  const fits = !drawer || border;
  const refutes = drawer === false && border === true;
  function change(which: 'drawer' | 'border', value: boolean) { (which === 'drawer' ? setDrawer : setBorder)(value); setChecked(false); }
  return <div className="co-case-maker">
    <p>So far, we've explained why an arrow cannot simply be reversed. Now make that limit visible.</p>
    <blockquote>Every ticket in Drawer R has a blue border.</blockquote>
    <p>Accept that rule for this exercise. We don't need to know why the tickets were arranged that way. A ticket in Drawer R must have a blue border.</p>
    <h3 id={id}>Someone claims: every blue-bordered ticket is in Drawer R. Can you build one ticket that fits the rule but disproves that claim?</h3>
    <div className="co-case-workbench">
      <div className="co-ticket" data-blue={border === true} aria-label={`Your ticket: ${drawer === null ? 'location undecided' : drawer ? 'in Drawer R' : 'outside Drawer R'}; ${border === null ? 'border undecided' : border ? 'blue border' : 'no blue border'}`}><span>ADMIT ONE</span><strong>R / 017</strong><span>{drawer === null ? 'Choose a location' : drawer ? 'In Drawer R' : 'Outside Drawer R'}</span><small>{border === null ? 'Choose a border' : border ? 'Blue border' : 'No blue border'}</small></div>
      <div className="co-case-decisions" aria-describedby={id}>
        <fieldset><legend>Where is the ticket?</legend><button type="button" aria-pressed={drawer === true} onClick={() => change('drawer', true)}>In Drawer R</button><button type="button" aria-pressed={drawer === false} onClick={() => change('drawer', false)}>Outside Drawer R</button></fieldset>
        <fieldset><legend>What border does it have?</legend><button type="button" aria-pressed={border === true} onClick={() => change('border', true)}>Blue border</button><button type="button" aria-pressed={border === false} onClick={() => change('border', false)}>No blue border</button></fieldset>
      </div>
    </div>
    <button type="button" className="co-primary" disabled={drawer === null || border === null} onClick={() => { setChecked(true); if (refutes) setFound(true); }}>Test this ticket</button>
    <div role="status">{checked && <div className="co-feedback"><strong>{!fits ? 'This ticket breaks the original rule.' : refutes ? 'This fits the rule and disproves the reverse.' : 'This fits the rule. Does it disprove the claim?'}</strong><p>{!fits ? "A ticket in Drawer R has to have a blue border. We need a case the rule allows, so this cannot serve as our example." : refutes ? "The ticket has a blue border but stays outside Drawer R. Nothing in the original rule forbids that. The reversed claim forbids it, so the two statements cannot mean the same thing." : drawer ? "A blue-bordered ticket inside Drawer R fits both statements. To show that the reverse adds a claim, try keeping the blue border and changing the location." : "A ticket without a blue border outside Drawer R fits both statements. The reverse makes a claim about blue-bordered tickets. Build one of those and see whether it has to be in Drawer R."}</p></div>}</div>
    {found && <div className="co-case-takeaway"><h3>Now explain the difference</h3><p>The rule limits tickets <strong>inside the drawer</strong>. It doesn't put every ticket with a blue border there. A possible case is enough to show that the reverse doesn't follow; we're not claiming that this ticket actually exists.</p><p>Without looking back, say what changed when you reversed the rule.</p></div>}
  </div>;
}
