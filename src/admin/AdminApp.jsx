import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { auth, onSignedOut } from './api.js';
import { Loading } from './ui.jsx';
import SignIn from './screens/SignIn.jsx';
import Overview from './screens/Overview.jsx';
import Members from './screens/Members.jsx';
import AddMember from './screens/AddMember.jsx';
import MemberPage from './screens/member/MemberPage.jsx';
import Activity from './screens/Activity.jsx';
import Tools from './screens/Tools.jsx';

/**
 * Who's at the desk decides what shows: the sign-in steps until there's a
 * signed-in member with a staff role, then the console.
 */
export default function AdminApp() {
  const [me, setMe] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setMe(await auth.whoami());
    } catch {
      setMe({ authenticated: false, offline: true });
    }
  }, []);

  useEffect(() => {
    refresh();
    return onSignedOut(refresh);
  }, [refresh]);

  if (!me) return <Loading what="Opening the console" />;
  if (!me.authenticated || me.requiresPin || !me.staff) return <SignIn me={me} onDone={refresh} />;

  const signOut = async () => {
    await auth.signOut();
    refresh();
  };

  return (
    <BrowserRouter basename="/admin">
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            NOMAD
            <small>ADMIN CONSOLE</small>
          </div>
          <nav className="nav">
            <NavLink to="/" end>
              Overview
            </NavLink>
            <NavLink to="/members">Members</NavLink>
            <NavLink to="/activity">Change log</NavLink>
            <NavLink to="/tools">Syncs &amp; tools</NavLink>
          </nav>
          <div className="sidebar-foot">
            <span>
              Signed in as <strong>{me.name || me.username}</strong>
            </span>
            <button onClick={signOut}>Sign out</button>
          </div>
        </aside>
        <main className="main">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/members" element={<Members />} />
            <Route path="/members/new" element={<AddMember />} />
            <Route path="/members/:username" element={<MemberPage />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="*" element={<Overview />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
