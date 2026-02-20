/*
Copyright (C) 2021  torn.space (https://torn.space)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import React from 'react';

import sendAPI from '../../utils/sendAPI';
import socket from '../../modules/socket';

declare const VERSION: string;
declare const loadLang: any;

declare let credentialState: number;
declare let loginInProgress: boolean;

class LoginOverlay extends React.Component<{ display: boolean }, { user: string, pass: string, seed: number }> {
    constructor (props: { display: boolean }) {
        super(props);

        this.state = {
            user: ``,
            pass: ``,
            seed: Math.random()
        };
    }

    langEng = () => {
        loadLang(`eng`);
    };

    langEsp = () => {
        loadLang(`esp`);
    };

    langTki = () => {
        loadLang(`tki`);
    };

    langChn = () => {
        loadLang(`chn`);
    };

    changeUsername = (event) => {
        this.setState({
            user: event.target.value,
            pass: this.state.pass
        });
    };

    changePassword = (event) => {
        this.setState({
            user: this.state.user,
            pass: event.target.value
        });
    };

    registerR = () => {
        socket.open();
        socket?.emit(`lore`, { team: `red` });
    };

    registerB = () => {
        socket.open();
        socket?.emit(`lore`, { team: `blue` });
    };

    registerG = () => {
        socket.open();
        socket?.emit(`lore`, { team: `green` });
    };

    registerY = () => {
        socket.open();
        socket?.emit(`lore`, { team: `yellow` });
    };

    registerPu = () => {
        socket.open();
        socket?.emit(`lore`, { team: `purple` });
    };

    login = async (e: React.FormEvent) => {
        e.preventDefault();

        const user = this.state.user;
        const pass = this.state.pass;

        if (user === `` || pass === ``) return;
        if (loginInProgress) return;
        loginInProgress = true;

        const playCookie = await sendAPI(`/login/`, `${user}%${pass}`);

        if (playCookie.status === 403) {
            credentialState = 1;
            loginInProgress = false;
            return;
        } else if (playCookie.status !== 200) {
            alert(`Failed to connect to Torn Account Services.`);

            loginInProgress = false;
            return;
        }

        const playCookieData = await playCookie.text();
        socket.open();

        console.log(`:TornNetRepository: Got PlayCookie: ${playCookieData}`);
        socket?.emit(`login`, { cookie: playCookieData, version: VERSION });
    };

    render = () => {
        // Build all 5 team buttons in a seeded-random order
        const allTeams = [
            <button key="r" id="registerR" onClick={this.registerR} style={{ borderColor: `#ff4444` }}>Join Alien Team (Red)!</button>,
            <button key="b" id="registerB" onClick={this.registerB} style={{ borderColor: `#4444ff` }}>Join Human Team (Blue)!</button>,
            <button key="g" id="registerG" onClick={this.registerG} style={{ borderColor: `#44bb44` }}>Join Cyborg Team (Green)!</button>,
            <button key="y" id="registerY" onClick={this.registerY} style={{ borderColor: `gold`, color: `gold` }}>Join Solar Sovereignty (Yellow)!</button>,
            <button key="p" id="registerPu" onClick={this.registerPu} style={{ borderColor: `violet`, color: `violet` }}>Join Phantom Accord (Purple)!</button>
        ];
        // Seed a simple shuffle using the stored random seed
        const shuffled = [...allTeams].sort((a, b) => (Math.sin(this.state.seed * (allTeams.indexOf(a) + 1) * 7) - Math.sin(this.state.seed * (allTeams.indexOf(b) + 1) * 7)));
        const buttonOrder = <div className="text-center">{shuffled}</div>;

        return !this.props.display
            ? null
            : (
                <div>
                    <div className="overlay-menu">
                        <div className="container">
                            <div className="guests">
                                <h3 className="text-center">New Players</h3>
                                {buttonOrder}
                            </div>
                            <div className="video">
                                <div className="text-center">
                                    <img src="img/harrlogo.png" alt="Logo" width="340" />
                                </div>
                            </div>
                            <div className="login">
                                <h3 className="text-center">Returning Players</h3>

                                <form action="/" onSubmit={((e => this.login(e)))} className="text-center">
                                    <input className="login-input" type="text" id="usernameid" autoComplete="username" onChange={this.changeUsername} placeholder="Username" />
                                    <input className="login-input" type="password" id="passid" autoComplete="current-password" onChange={this.changePassword} placeholder="Password" />

                                    <input className="login-btn" type="submit" value="Login" id="loginButton" />
                                </form>
                            </div>
                        </div>
                    </div>

                    <div className="link-container">
                        <div className="link-legal">
                            <a href="legal/privacy_policy.pdf">Privacy Policy</a>
                            <a href="legal/tos.pdf">Terms of Service</a>
                        </div>
                        <div className="link-lang">
                            <a onClick={this.langEng}>Eng</a>
                            <a onClick={this.langEsp}>Esp</a>
                            <a onClick={this.langTki}>Tki</a>
                            <a onClick={this.langChn}>Chn</a>
                        </div>
                    </div>
                </div>
            );
    };
}

export default LoginOverlay;
