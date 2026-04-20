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

import { translate } from '../localizer';
import { write } from '../utils/helper';

// Convert ticks to a human-readable time string (ticks run at 25/sec on server)
const TICKS_PER_SEC = 25;
const ticksToTime = (ticks) => {
    if (!ticks || ticks < 0) return `0h 0m 0s`;
    const totalSeconds = Math.floor(ticks / TICKS_PER_SEC);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
};

// Render the Statistics page onto the base menu canvas
global.renderStats = function () {
    const ctx = baseMenuCtx;
    const W = 768;
    const H = 512;

    // ── Title ──
    ctx.textAlign = `center`;
    ctx.font = `28px ShareTech`;
    ctx.fillStyle = `cyan`;
    write(ctx, translate(`Statistics`), W / 2, 44);

    // ── Divider ──
    ctx.strokeStyle = `rgba(0,255,255,0.25)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, 58);
    ctx.lineTo(W - 24, 58);
    ctx.stroke();

    // ── Stats rows ──
    ctx.textAlign = `left`;
    ctx.font = `18px ShareTech`;

    const col1 = 40;
    const col2 = 380;
    const rowH = 58;
    const startY = 100;

    const rows = [
        {
            label: translate(`Time Played`),
            value: ticksToTime(timePlayed)
        },
        {
            label: translate(`Bases Destroyed`),
            value: `${baseKills}`
        },
        {
            label: translate(`Time Drifting`),
            value: ticksToTime(driftTimer)
        },
        {
            label: translate(`Total Kills`),
            value: `${kills}`
        }
    ];

    for (let i = 0; i < rows.length; i++) {
        const y = startY + i * rowH;

        // Background strip
        ctx.fillStyle = (i % 2 === 0) ? `rgba(255,255,255,0.04)` : `rgba(0,0,0,0.12)`;
        ctx.fillRect(24, y - 22, W - 48, rowH - 6);

        // Label
        ctx.fillStyle = `rgba(180,220,255,0.9)`;
        write(ctx, rows[i].label, col1, y);

        // Value
        ctx.fillStyle = `white`;
        ctx.textAlign = `right`;
        write(ctx, rows[i].value, W - col1, y);
        ctx.textAlign = `left`;
    }

    // ── Kill breakdown section ──
    const killSectionY = startY + rows.length * rowH + 12;

    ctx.font = `20px ShareTech`;
    ctx.fillStyle = `cyan`;
    ctx.textAlign = `center`;
    write(ctx, translate(`Kill Breakdown`), W / 2, killSectionY);

    ctx.strokeStyle = `rgba(0,255,255,0.15)`;
    ctx.beginPath();
    ctx.moveTo(80, killSectionY + 8);
    ctx.lineTo(W - 80, killSectionY + 8);
    ctx.stroke();

    // Filter buttons
    const filters = [`all`, `players`, `bots`];
    const filterLabels = [translate(`All`), translate(`Players`), translate(`Bots / AI`)];
    const btnW = 150; const btnH = 30; const btnGap = 20;
    const totalBtnW = filters.length * btnW + (filters.length - 1) * btnGap;
    const btnStartX = (W - totalBtnW) / 2;
    const btnY = killSectionY + 20;

    ctx.font = `15px ShareTech`;
    for (let i = 0; i < filters.length; i++) {
        const bx = btnStartX + i * (btnW + btnGap);
        const active = (statsFilter === filters[i]);
        ctx.fillStyle = active ? `rgba(0,200,255,0.35)` : `rgba(255,255,255,0.07)`;
        ctx.strokeStyle = active ? `cyan` : `rgba(255,255,255,0.2)`;
        ctx.lineWidth = active ? 2 : 1;
        roundRect(ctx, bx, btnY, btnW, btnH, 6, true, true);
        ctx.fillStyle = active ? `cyan` : `rgba(200,220,255,0.8)`;
        ctx.textAlign = `center`;
        write(ctx, filterLabels[i], bx + btnW / 2, btnY + 20);
    }

    // Filtered kill count
    let displayedKills = kills;
    let filterDesc = translate(`Total: All kills`);
    if (statsFilter === `players`) {
        displayedKills = playerKills;
        filterDesc = translate(`Human players only`);
    } else if (statsFilter === `bots`) {
        displayedKills = botKills;
        filterDesc = translate(`Bots / AI only`);
    }

    const killCountY = btnY + btnH + 36;
    ctx.font = `36px ShareTech`;
    ctx.fillStyle = `white`;
    ctx.textAlign = `center`;
    write(ctx, `${displayedKills}`, W / 2, killCountY);

    ctx.font = `14px ShareTech`;
    ctx.fillStyle = `rgba(180,200,220,0.7)`;
    write(ctx, filterDesc, W / 2, killCountY + 22);

    // ── Footer note ──
    ctx.font = `12px ShareTech`;
    ctx.fillStyle = `rgba(120,150,180,0.5)`;
    write(ctx, translate(`Stats tracked from current session only`), W / 2, H - 16);

    ctx.textAlign = `left`;
    ctx.font = `14px ShareTech`;
};

// Handle hover state for filter buttons
global.statsOnHover = function () {
    // No hover needed for this simple layout; handled via click
    seller = 0;
};

// Handle click events on the stats tab
global.statsOnClick = function (buttonID) {
    // buttonID is relative to the base menu global seller ID space (600+ for stats tab)
    const filters = [`all`, `players`, `bots`];
    const filterLabels = [`All`, `Players`, `Bots / AI`];
    const btnW = 150; const btnH = 30; const btnGap = 20;
    const W = 768;
    const totalBtnW = filters.length * btnW + (filters.length - 1) * btnGap;
    const btnStartX = (W - totalBtnW) / 2;

    // Recalculate button positions
    const killSectionY = 100 + 4 * 58 + 12; // startY + rows * rowH + offset
    const btnY = killSectionY + 20;

    const mx2 = mx - baseMenuX;
    const my2 = my - baseMenuY;

    if (my2 >= btnY && my2 <= btnY + btnH) {
        for (let i = 0; i < filters.length; i++) {
            const bx = btnStartX + i * (btnW + btnGap);
            if (mx2 >= bx && mx2 <= bx + btnW) {
                statsFilter = filters[i];
                return;
            }
        }
    }
};
