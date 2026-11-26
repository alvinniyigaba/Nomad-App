import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { auth, onSignedOut } from './api.js';
import { Loading, Terrain } from './ui.jsx';
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
        <header className="topbar">
          <Terrain height={90} />
          <div className="topbar-inner">
            <div className="topbar-left">
              <div className="brand">
                NOMAD<small>ADMIN</small>
              </div>
              <nav className="nav" aria-label="Console">
                <NavLink to="/" end>
                  Overview
                </NavLink>
                <NavLink to="/members">Members</NavLink>
                <NavLink to="/activity">Change log</NavLink>
                <NavLink to="/tools">Syncs &amp; tools</NavLink>
              </nav>
            </div>
            <div className="account">
              <button onClick={signOut}>Sign out</button>
              <span className="account-initial" title={`Signed in as ${me.name || me.username}`} aria-label={`Signed in as ${me.name || me.username}`}>
                {(me.name || me.username || '?').charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>
        <main className="main">
          <Routes>
            <Route path="/" element={<Overview me={me} />} />
            <Route path="/members" element={<Members />} />
            <Route path="/members/new" element={<AddMember />} />
            <Route path="/members/:username" element={<MemberPage />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="*" element={<Overview me={me} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
