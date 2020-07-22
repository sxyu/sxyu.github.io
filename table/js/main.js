//(function() {
// List of measures
var m_reg = [];
// Maps measure ID to index
var m_reg_map = {};
// List of relations
var mrel_reg = [];
// List of measure pairs [m1, m2] using each relation
var mrel_usage = [];
// Best relation betweeen measures
var mrel_dists = [];
// Path for best relation betweeen measures, edges marked
// by mrel_reg indices
var mrel_path = [];

// List of separations
var msep_reg = [];
// Map separation name to index
var msep_reg_map = {};
// Best separation separation functions
var msep_best_func = [];

// LocalStorage entry name
var local_storage_reg_name = "userdata";

var register_measure = function(meas_id, disp, desc) {
    if (m_reg_map[meas_id] !== undefined) {
        console.log('Attempt to register duplicate measure ' + meas_id);
        return;
    }
    m_reg_map[meas_id] = m_reg.length;
    m_reg.push({ id: meas_id, disp: disp, desc: desc });
    msep_best_func.push([]);
    for (var i = 0; i < m_reg.length - 1; ++i) {
        msep_best_func[i].push({ sep: 0, funcs: [] });
        msep_best_func[m_reg.length - 1].push({ sep: 0, funcs: [] });
    }
    msep_best_func[m_reg.length - 1].push({ sep: 0, funcs: [] });
};

var register_measure_auto = function(meas_id, meas_disp, italic, meas_tooltip) {
    if (meas_disp === undefined) {
        meas_disp = meas_id;
    }
    if (meas_tooltip !== undefined) {
        var tagname = (italic != undefined && italic === true) ? "em" : "span";
        meas_disp = "<" + tagname
            + " title=\"" + remove_quotes(meas_tooltip) + "\">" + meas_disp
            + "</" + tagname + ">";
    } else if (italic != undefined && italic === true) {
        meas_disp = "<em>" + meas_disp + "</em>";
    }
    register_measure(meas_id, meas_disp, meas_tooltip);
};

var persistence_write = function() {
    window.localStorage.setItem(local_storage_reg_name, JSON.stringify({
        meas: m_reg,
        rel: mrel_reg,
        sep: msep_reg
    }));
};

var persistence_read = function() {
    m_reg = [];
    m_reg_map = {}; 
    mrel_reg = [];
    mrel_usage = [];
    msep_reg = [];
    msep_reg_map = {}; 
    msep_best_func = [];
    var m_reg_val = window.localStorage.getItem(local_storage_reg_name);
    if (m_reg_val === null) return false;
    var data = JSON.parse(m_reg_val);

    m_reg = data.meas;
    for (var i = 0; i < m_reg.length; i++) {
        m_reg_map[m_reg[i].id] = i;
    }
    mrel_reg = data.rel;
    msep_reg = data.sep;
    recalc_msep_all();
    recalc_mrel_shortest_paths();
    return true;
};

var clear_all_rels_seps = function() {
    mrel_reg = [];
    mrel_usage = [];
    msep_reg = [];
    msep_reg_map = {}; 
    msep_best_func = [];
    render_all();
};

var reset_all = function(data_file) {
    m_reg = [];
    m_reg_map = {};
    mrel_reg = [];
    mrel_usage = [];
    mrel_dists = [];
    mrel_path = [];
    msep_reg = [];
    msep_best_func = [];
    msep_reg_map = {}; 
    reload_default_rels_seps(data_file);
};

var register_mrel = function(meas_id_1, meas_id_2, m1_le_m2_expon, description, attribution, attr_url) {
    if (m_reg_map[meas_id_1] != undefined &&
        m_reg_map[meas_id_2] != undefined &&
        m1_le_m2_expon > 0) {
        if (description === undefined) {
            description = ''; 
        }
        if (attribution === undefined) {
            attribution = []; 
        }
        if (attr_url === undefined) {
            attr_url = []; 
        }
        mrel_reg.push({ m1: meas_id_1, m2: meas_id_2, expon: m1_le_m2_expon, desc: description, attrib: attribution, url: attr_url });
    } else {
        console.log('Attempt to add invalid relation ' + meas_id_1 + ' <= ' + meas_id_2);
    }
};
var update_mrel = function(mrel_id, meas_id_1, meas_id_2, m1_le_m2_expon, description, attribution, attr_url) {
    if (m_reg_map[meas_id_1] != undefined &&
        m_reg_map[meas_id_2] != undefined &&
        m1_le_m2_expon > 0) {
        if (description === undefined) {
            description = ''; 
        }
        if (attribution === undefined) {
            attribution = []; 
        }
        if (attr_url === undefined) {
            attr_url = []; 
        }
        mrel_reg[mrel_id].m1 = meas_id_1;
        mrel_reg[mrel_id].m2 = meas_id_2;
        mrel_reg[mrel_id].expon = m1_le_m2_expon;
        mrel_reg[mrel_id].desc = description;
        mrel_reg[mrel_id].attrib = attribution;
        mrel_reg[mrel_id].url = attr_url;
    } else {
        console.log('Attempt to add invalid relation ' + meas_id_1 + ' <= ' + meas_id_2);
    }
};
var register_msep = function(name, description, attribution, attr_url) {
    if (msep_reg_map[name] !== undefined) {
        console.log('Attempt to add function with duplicate name: ' + name);
        return;
    }
    if (attribution === undefined) {
        attribution = []; 
    }
    if (attr_url === undefined) {
        attr_url = []; 
    }
    msep_reg_map[name] = msep_reg.length;
    msep_reg.push({ name: name, desc: description, attrib: attribution, url: attr_url });
}
var update_msep_measure = function(id, meas_id, lower_expon, upper_expon) {
    if (typeof id === 'string') {
        id = msep_reg_map[id];
    }
    if (upper_expon === undefined) {
        upper_expon = lower_expon;
    }
    if (m_reg_map[meas_id] !== undefined && msep_reg.length > id && id >= 0) {
        msep_reg[id][meas_id] = { lower: lower_expon, upper: upper_expon };
    } else {
        console.log('Attempt to add invalid bound ' + meas_id + ' on function ' + id);
    }
};
var recalc_msep = function(id) {
    if (typeof id === 'string') {
        id = msep_reg_map[id];
    }
    for (var i = 0; i < m_reg.length; i++) {
        for (var j = 0; j < m_reg.length; j++) {
            if (i == j) continue;
            if (msep_reg[id][m_reg[i].id] === undefined ||
                msep_reg[id][m_reg[j].id] === undefined ||
                msep_reg[id][m_reg[i].id].lower === undefined ||
                msep_reg[id][m_reg[j].id].upper === undefined ||
                msep_reg[id][m_reg[i].id].lower === null ||
                msep_reg[id][m_reg[j].id].upper === null) continue;
            var sep = msep_reg[id][m_reg[i].id].lower / msep_reg[id][m_reg[j].id].upper
            if (sep > msep_best_func[i][j].sep) {
                msep_best_func[i][j].sep = sep;
                msep_best_func[i][j].funcs = [msep_reg[id].name];
                update_mrel_tight_error();
            } else if (sep === msep_best_func[i][j].sep) {
                var exists = false;
                for (var k = 0; k < msep_best_func[i][j].funcs.length; ++k) {
                    if (msep_best_func[i][j].funcs[k] === msep_reg[id].name) {
                        exists = true;
                        break;
                    }
                }
                if (!exists) {
                    msep_best_func[i][j].funcs.push(msep_reg[id].name);
                }
            }
        }
    }
};

var recalc_msep_all = function() {
    msep_reg_map = {};
    msep_best_func = [];
    for (var i = 0; i < m_reg.length; i++) {
        msep_best_func.push([]);
        for (var j = 0; j < m_reg.length; j++) {
            msep_best_func[i].push({ sep: 0, funcs: [] });
        }
    }
    for (var i = 0; i < msep_reg.length; i++) {
        msep_reg_map[msep_reg[i].name] = i;
    }
    for (var i = 0; i < msep_reg.length; i++) {
        recalc_msep(i);
    }
};

var autofill_func = function(sep_id) {
    for (var m_id = 0; m_id < m_reg.length; m_id++) {
        var m_symb_id = m_reg[m_id].id;
        var target_entry = msep_reg[sep_id][m_symb_id];
        var lb = undefined;
        var ub = undefined;
        if (target_entry !== undefined) {
            lb = target_entry.lower;
            ub = target_entry.upper
        }
        if (lb === null || lb == undefined) lb = undefined;
        else lb = parseFloat(lb);
        if (ub === null || ub == undefined) ub = undefined;
        else ub = parseFloat(ub);

        for (var j = 0; j < m_reg.length; j++) {
            if (m_id == j) continue;
            var mj_symb_id = m_reg[j].id;
            var entry = msep_reg[sep_id][mj_symb_id];
            if (entry === undefined) continue;
            var entry_lower_valid = entry.lower !== undefined && entry.lower !== null;
            var entry_upper_valid = entry.upper !== undefined && entry.upper !== null;

            var expon_from = mrel_dists[j][m_id][0];
            if (!isNaN(expon_from) && expon_from !== Infinity && entry_lower_valid) {
                if (lb === undefined || lb < entry.lower / expon_from) {
                    lb = entry.lower / expon_from;
                }
            }

            var expon_to = mrel_dists[m_id][j][0];
            if (!isNaN(expon_to) && expon_to !== Infinity && entry_upper_valid) {
                if (ub === undefined || ub > entry.upper * expon_to) {
                    ub = entry.upper * expon_to;
                }
            }
        }

        if ((lb !== undefined || ub !== undefined) && msep_reg[sep_id][m_symb_id] === undefined) {
            msep_reg[sep_id][m_symb_id] = { lower: null, upper: null };
        }
        if (lb !== undefined) {
            msep_reg[sep_id][m_symb_id].lower = lb;
        }
        if (ub !== undefined) {
            msep_reg[sep_id][m_symb_id].upper = ub;
        }
    }
};

var autofill_all_funcs = function() {
    for (var t = 0; t < msep_reg.length; t++) {
        autofill_func(t);
    }
}; 

var reload_default_rels_seps = function(data_file) {
    if (data_file === undefined) {
        data_file = 'default';
    }
    $.getJSON("data/" + data_file + ".json").done(function(json) {
        window.localStorage.setItem(local_storage_reg_name, JSON.stringify(json));
        persistence_read();
        autofill_all_funcs();
        render_all();
    }).fail(function(jqxhr, textStatus, error) {
        console.log('Reset failed: ' + textStatus + ', ' + error);
    });
}

var sep_table = $('#sep-table');
var msep_table = $('#msep-table-body');
var msep_table_header = $('#msep-table-header-row');
var mrel_table = $('#mrel-table-body');
var popup = $('#popup');
var confirm_modal = $('#confirm-modal');
var _mrel_edit_id = null;
var _mrel_pre_edit_data = null;
var _msep_popup_sep_data = null;
var _msep_edit_id = null;
var _msep_pre_edit_data = null;
var _confirm_modal_calmsepack = null;

var format_asymptotic_num = function(val) {
    if (val === Infinity) return '\u221E';
    if (val === -Infinity) return '-\u221E';
    return (Math.round(val * 1e4) / 1e4).toString();
};

var remove_quotes = function(txt) {
    if (txt === undefined) return '';
    return txt.replace(/\"/g, '&quot;');
};

var popup_show = function(off) {
    popup.css('display', 'block');
    popup.css('top', off.top + "px");
    var win_wid = $(window).width();
    var pop_wid = popup.width() + 30;
    if (off.left + pop_wid > win_wid) {
        popup.css('left', win_wid - pop_wid + "px");
    } else {
        popup.css('left', off.left + "px");
    }
};

var confirm_modal_show = function(msg, calmsepack) {
    confirm_modal.css('display', 'block');
    confirm_modal.find('#confirm-modal-alert-text').html(msg);
    _confirm_modal_calmsepack = calmsepack;
};

var recalc_mrel_shortest_paths = function() {
    // Compute distances using Floyd-Warshall O(num measures^3)
    mrel_dists = [];
    mrel_path = [];
    mrel_usage = [];
    var mrel_path_mid = [];

    for (var k = 0; k < m_reg.length; k++) {
        mrel_dists.push([]);
        mrel_path.push([]);
        mrel_path_mid.push([]);
        for (var j = 0; j < m_reg.length; j++) {
            mrel_dists[k].push([Infinity, 1]);
            mrel_path[k].push([]);
            mrel_path_mid[k].push({});
        }
    }
    for (var j = 0; j < mrel_reg.length; j++) {
        var m1 = m_reg_map[mrel_reg[j].m1];
        var m2 = m_reg_map[mrel_reg[j].m2];
        if (mrel_reg[j].expon < mrel_dists[m1][m2][0]) {
            mrel_dists[m1][m2] = [mrel_reg[j].expon, 1];
            mrel_path_mid[m1][m2] = { mrel_id: j };
        }
        mrel_usage.push([]);
    }

    for (var k = 0; k < m_reg.length; k++) {
        //var spr = '';
        for (var i = 0; i < m_reg.length; i++) {
            if (i === k || mrel_dists[i][k][0] === Infinity) continue;
            for (var j = 0; j < m_reg.length; j++) {
                if (i === j || j === k || mrel_dists[k][j][0] === Infinity) continue;
                var cost = mrel_dists[i][k][0] * mrel_dists[k][j][0];
                var len = mrel_dists[i][k][1] * mrel_dists[k][j][1];
                if (cost < mrel_dists[i][j][0] ||
                    (cost === mrel_dists[i][j][0] &&
                     len < mrel_dists[i][j][1])) {
                    mrel_dists[i][j][0] = cost;
                    mrel_dists[i][j][1] = len;
                    mrel_path_mid[i][j] = { mid: k };
                }
            }
        }
    }

    var fw_build_paths_helper = function(start, end) {
        var dpm = mrel_path_mid[start][end];
        if (dpm.mid != undefined) {
            fw_build_paths_helper(start, dpm.mid);
            fw_build_paths_helper(dpm.mid, end);
            mrel_path[start][end] =
                mrel_path[start][dpm.mid].concat(mrel_path[dpm.mid][end]);
            for (var i = 0; i < mrel_path[start][end].length; ++i) {
                mrel_usage[mrel_path[start][end][i]].push([start, end]);
            }
        } else if (dpm.mrel_id != undefined) {
            mrel_path[start][end] = [dpm.mrel_id];
            mrel_usage[dpm.mrel_id].push([start, end]);
        }
    }

    // Build paths after Floyd-Warshall
    for (var i = 0; i < m_reg.length; i++) {
        for (var j = 0; j < m_reg.length; j++) {
            if (i === j || mrel_path[i][j].length > 0) continue;
            fw_build_paths_helper(i, j);
        }
    }
};

var render_all = function() {
    recalc_msep_all();
    recalc_mrel_shortest_paths();
    render_mrel_table();
    render_msep_table();
    render_primary_table();
};

var render_primary_table = function() {
    sep_table.empty();            
    var table = sep_table[0];
    var thead = document.createElement("thead");

    var header_row = document.createElement("tr");
    var h_lecell = document.createElement("th");
    h_lecell.id = "sep-table-lessthan-sign";
    var h_lecell_text = document.createTextNode("r = \xD5(c)");
    h_lecell.appendChild(h_lecell_text);
    h_lecell.setAttribute('title', 'Row M, col N: for all f, M(f) = O(N(f)^X) and exists f, M(f) = O(N(f)^Y)')
    header_row.appendChild(h_lecell);

    for (var i = 0; i < m_reg.length; i++) {
        var hcell = document.createElement("th");
        hcell.setAttribute('measure_id', m_reg[i].id);
        hcell.setAttribute('class', "measure");
        $(hcell).html(m_reg[i].disp);
        header_row.appendChild(hcell);
    }

    thead.appendChild(header_row);
    table.appendChild(thead);

    // Check each relation to make sure it is used
    mrel_table.children('tr').removeClass('mrel-table-useless');
    for (var i = 0; i < mrel_reg.length; i++) {
        if (mrel_usage[i].length === 0) {
            $('#mrel-row-' + i).addClass('mrel-table-useless');
        }
    }

    var tbody = document.createElement("tbody");
    for (var i = 0; i < m_reg.length; i++) {
        var row = document.createElement("tr");
        // Add measure cell
        var cell_meas = document.createElement("td");
        cell_meas.setAttribute('measure_id', m_reg[i].id);
        cell_meas.setAttribute('class', "measure");
        $(cell_meas).html(m_reg[i].disp);
        row.appendChild(cell_meas);

        // Add relation cells
        for (var j = 0; j < m_reg.length; j++) {
            var cell = document.createElement("td");
            if (i === j) {
                cell.setAttribute('class', "sep-table-diagonal");
            } else {
                var $cell = $(cell);
                var msep_val = msep_best_func[i][j].sep;
                var mrel_val = mrel_dists[i][j][0];
                var additional_classes = ' ';
                if (msep_val == mrel_val) additional_classes += 'tight-bound';
                else if (msep_val > mrel_val) additional_classes += 'error-bound';
                var cell_txt = 
                    '<span class="msep-text' + additional_classes + '" title="Best separation">' +
                    format_asymptotic_num(msep_val) +
                        '</span> <span class="mrel-text' + additional_classes + '" title="Best relation">' +
                    format_asymptotic_num(mrel_val) +
                    '</span><br/><span class="func-text' + additional_classes + '">';
                cell.id = "sep-table-cell-" + i + "-" + j;
                cell.setAttribute('row_id', i);
                cell.setAttribute('col_id', j);
                $cell.addClass("sep-table-cell");
                for (var t = 0; t < mrel_path[i][j].length; ++t) {
                   $cell.addClass("mrel-" + mrel_path[i][j][t]);
                }
                var first_excess = true;
                for (var t = 0; t < msep_best_func[i][j].funcs.length; ++t) {
                    var msep_id = msep_reg_map[msep_best_func[i][j].funcs[t]];
                    if (t > 2 || cell_txt.length > 500) {
                        if (first_excess) {
                            first_excess = false;
                            cell_txt += '; ...';
                        }
                        continue;
                    }
                    $cell.addClass("msep-" + msep_id);
                    if (t > 0) cell_txt += '; ';
                    var entry = msep_reg[msep_id];
                    cell_txt += '<span class="func-text-entry" title="Function achieving best separation.\n' + remove_quotes(entry.desc) + '\nAttribs: ';
                    // Attributions
                    if (entry.attrib.length == 0) {
                        cell_txt += '">';
                        cell_txt += entry.name;
                    } else {
                        for (var u = 0; u < entry.attrib.length; ++u) {
                            if (u > 0) {
                                cell_txt += ', ';
                            }
                            cell_txt += remove_quotes(entry.attrib[u]);
                        }
                        cell_txt += '">';
                        cell_txt += entry.name;
                    }
                    cell_txt += '</span>';
                }
                cell_txt += '</span>';
                $cell.html(cell_txt);
                $cell.click(function(e){
                    e.stopPropagation();
                    var tgt = $(e.target);
                    if (e.target.nodeName === 'A' || (tgt.parent() && tgt.parent()[0].nodeName === 'A')) return;
                    while (tgt != undefined && !tgt.hasClass('sep-table-cell')) {
                        tgt = tgt.parent();
                    }
                    var all_cells = sep_table.find('.sep-table-cell');
                    var tgt_has_class = tgt.hasClass('sep-table-inspect');
                    all_cells.removeClass('sep-table-inspect');
                    all_cells.removeClass('sep-table-inspect-path');
                    if (tgt_has_class) {
                        popup.css('display', 'none');
                        return;
                    }
                    tgt.addClass('sep-table-inspect');
                    var popup_text_ele = $('#popup-mrel-text');
                    var m1 = parseInt(tgt.attr('row_id'));
                    var m2 = parseInt(tgt.attr('col_id'));
                    popup_text = '<div class="popup-heading">Best relation</div>' + m_reg[m1].disp;
                    var total_expon = 1;
                    for (var t = 0; t < mrel_path[m1][m2].length; ++t) {
                        var mrel_id = mrel_path[m1][m2][t];
                        var mrel_entry = mrel_reg[mrel_id];
                        total_expon *= mrel_entry.expon;
                        if (mrel_path[m1][m2].length > 1) {
                            $('#sep-table-cell-' + m_reg_map[mrel_entry.m1] +
                                "-" + m_reg_map[mrel_entry.m2])
                                .addClass('sep-table-inspect-path')
                        }
                        var expon_txt = total_expon === 1 ? "" : "<sup>" + total_expon + "</sup>";
                        popup_text += " = &Otilde;(" + m_reg[m_reg_map[mrel_entry.m2]].disp
                            + expon_txt + ")";
                    }
                    if(mrel_path[m1][m2].length <= 0) {
                        popup_text += " <em>vs.</em> " + m_reg[m2].disp;
                    }
                    popup_text += '<br><span class="popup-attrib">';
                    var init_len = popup_text.length;
                    for (var t = 0; t < mrel_path[m1][m2].length; ++t) {
                        var mrel_id = mrel_path[m1][m2][t];
                        var mrel_entry = mrel_reg[mrel_id];
                        if (t > 0) {
                            if (popup_text.length === init_len ||
                                popup_text[popup_text.length - 2] === ';') {
                                popup_text += '<span title="' +
                                    remove_quotes(mrel_reg[mrel_path[m1][m2][t-1]].desc) + '">Trivial</span>'
                            }
                            popup_text += '; ';
                        }
                        for (var r = 0; r < mrel_entry.attrib.length; ++r) {
                            if (r > 0) popup_text += ', ';

                            if (r >= mrel_entry.url.length || mrel_entry.url[r] === '' ||
                                mrel_entry.url[r] === undefined) {
                                popup_text += '<span title="' +
                                    remove_quotes(mrel_entry.desc) + '">' +
                                    remove_quotes(mrel_entry.attrib[r]) +
                                    '</span>';
                            } else {
                                popup_text += '<a href="' +
                                    mrel_entry.url[r]
                                    + '" title="' +
                                    remove_quotes(mrel_entry.desc) +
                                    '">' + remove_quotes(mrel_entry.attrib[r]) + '</a>';
                            }
                        }
                    }
                    if(mrel_path[m1][m2].length <= 0) {
                        popup_text += 'No polynomial relation known';
                    }
                    else if (popup_text.length === init_len ||
                        popup_text[popup_text.length - 2] === ';') {
                        popup_text += '<span title="' +
                            remove_quotes(mrel_reg[mrel_path[m1][m2][mrel_path[m1][m2].length-1]].desc) + '">Trivial</span>'
                    }
                    popup_text += '</span><div class="popup-heading popup-heading-next">Best separation(s)</div>';

                    for (var k = 0; k < msep_best_func[m1][m2].funcs.length; k++) {
                        var msep_entry = msep_reg[msep_reg_map[msep_best_func[m1][m2].funcs[k]]];
                        popup_text += '<div class="popup-func" title="' +
                            remove_quotes(msep_entry.desc) + '">' + msep_entry.name + '</div><div class="popup-func-info">' + msep_entry.desc;
                        if (msep_entry.attrib.length > 0) {
                            popup_text += ' <span class="popup-attrib">';
                            for (var r = 0; r < msep_entry.attrib.length; ++r) {
                                if (r > 0) popup_text += ', ';

                                if (r >= msep_entry.url.length || msep_entry.url[r] === '' ||
                                    msep_entry.url[r] === undefined) {
                                    popup_text += remove_quotes(msep_entry.attrib[r]);
                                } else {
                                    popup_text += '<a href="' +
                                        msep_entry.url[r] +
                                        '">' + remove_quotes(msep_entry.attrib[r]) + '</a>';
                                }
                            }
                            popup_text += '</span>';
                        }
                        popup_text += '</div>';
                    }

                    popup_text_ele.html(popup_text);
                    var table_wrap = $('#sep-table-wrapper');
                    var off = table_wrap.offset();
                    off.top += table_wrap.height() - 8;
                    popup_show(off);
                });
            }
            row.appendChild(cell);
        }

        tbody.appendChild(row);
    }
    table.appendChild(tbody);
    persistence_write();
    $('.measure-selector').each(function(index) {
        $(this).empty();
        for (var i = 0; i < m_reg.length; i++) {
            var opt = document.createElement("option");
            opt.text = m_reg[i].id;
            this.add(opt);
        }
    });
};

var update_mrel_tight_error = function() {
    for (var i = 0; i < mrel_reg.length; i++) {
        var ele = $('#mrel-row-' + i);
        ele.removeClass('mrel-table-tight');
        if (msep_best_func[m_reg_map[mrel_reg[i].m1]][m_reg_map[mrel_reg[i].m2]].sep === mrel_reg[i].expon) {
            ele.addClass('mrel-table-tight');
        } else if (msep_best_func[m_reg_map[mrel_reg[i].m1]][m_reg_map[mrel_reg[i].m2]].sep > mrel_reg[i].expon) {
            ele.addClass('mrel-table-useless');
        }
    }
};

var render_mrel_table = function() {
    mrel_table.empty();
    for (var i = 0; i < mrel_reg.length; i++) {
        var row = document.createElement("tr");
        row.id = 'mrel-row-' + i;
        row.setAttribute('mrel_id', i);
        var cell_m1 = document.createElement("td");
        cell_m1.setAttribute('measure_id', mrel_reg[i].m1);
        $(cell_m1).addClass("measure");
        $(cell_m1).html(m_reg[m_reg_map[mrel_reg[i].m1]].disp);
        row.appendChild(cell_m1);

        var cell_m2 = document.createElement("td");
        cell_m2.setAttribute('measure_id', mrel_reg[i].m2);
        $(cell_m2).addClass("measure");
        $(cell_m2).html(m_reg[m_reg_map[mrel_reg[i].m2]].disp);
        row.appendChild(cell_m2);

        var cell_expon = document.createElement("td");
        var cell_expon_text = document.createTextNode(format_asymptotic_num(mrel_reg[i].expon));
        cell_expon.appendChild(cell_expon_text);
        row.appendChild(cell_expon);

        var cell_desc = document.createElement("td");
        $(cell_desc).html(mrel_reg[i].desc);
        row.appendChild(cell_desc);

        var cell_attr = document.createElement("td");
        for (var j = 0; j < mrel_reg[i].attrib.length; ++j) {
            if (j > 0) {
                var pad_text = document.createTextNode(', ');
                cell_attr.appendChild(pad_text);
            }

            if (j >= mrel_reg[i].url.length || mrel_reg[i].url[j] === '' ||
                mrel_reg[i].url[j] === undefined) {
                var cell_attr_text = document.createTextNode(mrel_reg[i].attrib[j]);
                cell_attr.appendChild(cell_attr_text);
            } else {
                var cell_attr_a = document.createElement("a");
                var cell_attr_text = document.createTextNode(mrel_reg[i].attrib[j]);
                cell_attr_a.appendChild(cell_attr_text);
                cell_attr_a.setAttribute('href', mrel_reg[i].url[j]);
                cell_attr.appendChild(cell_attr_a);
            }
        }
        row.appendChild(cell_attr);

        var cell_actions = document.createElement("td");

        var cell_actions_a_edit = document.createElement("a");
        cell_actions_a_edit.setAttribute('title', "Edit relation");
        cell_actions_a_edit.setAttribute('class', 'table-action edit');
        cell_actions_a_edit.setAttribute('mrel_id', i);
        var cell_actions_i_edit = document.createElement("i");
        cell_actions_i_edit.setAttribute('class', 'material-icons');
        var cell_actions_i_edit_text = document.createTextNode('\uE3C9');
        cell_actions_i_edit.appendChild(cell_actions_i_edit_text);
        cell_actions_a_edit.appendChild(cell_actions_i_edit);
        cell_actions.appendChild(cell_actions_a_edit);

        $(cell_actions_a_edit).click(function(e){
            var tgt = $(e.target);
            mrel_id = tgt.parent().attr('mrel_id');
            e.stopPropagation();
            if (mrel_id === undefined) return;
            var mrel_txt = $('#mrel-add-text');
            var mrel_add_btn = $('#mrel-add-btn');
            mrel_txt.html('Edit relation, row ' + mrel_id + ': M1 = &Otilde;(M2<sup>X</sup>)' );
            mrel_add_btn.html('Update');
            $(document).scrollTop(mrel_txt.offset().top - $(window).height() / 3);

            _mrel_pre_edit_data = { m1: $('#mrel-m1')[0].value, m2:  $('#mrel-m2')[0].value, expon: $('#mrel-expon')[0].value,
                                  desc: $('#mrel-desc')[0].value, attrib: $('#mrel-attrib')[0].value, url: $('#mrel-urls')[0].value };

            $('#mrel-m1')[0].value = mrel_reg[mrel_id].m1;
            $('#mrel-m2')[0].value = mrel_reg[mrel_id].m2;
            $('#mrel-expon')[0].value = mrel_reg[mrel_id].expon;
            $('#mrel-desc')[0].value = mrel_reg[mrel_id].desc;
            var attrib_txt = '';
            if (mrel_reg[mrel_id].attrib !== undefined) {
                for (var i = 0; i < mrel_reg[mrel_id].attrib.length; i++) {
                    attrib_txt += mrel_reg[mrel_id].attrib[i] + '\n';
                }
            }
            $('#mrel-attrib')[0].value = attrib_txt;

            var urls_txt = '';
            if (mrel_reg[mrel_id].url !== undefined) {
                for (var i = 0; i < mrel_reg[mrel_id].url.length; i++) {
                    urls_txt += mrel_reg[mrel_id].url[i] + '\n';
                }
            }
            $('#mrel-urls')[0].value = urls_txt;
            _mrel_edit_id = mrel_id;
            $('#mrel-add-section').addClass('editing');
            $('#mrel-add-error').empty();
        });

        var cell_actions_a_del = document.createElement("a");
        cell_actions_a_del.setAttribute('title', "Delete relation");
        cell_actions_a_del.setAttribute('class', 'table-action delete');
        cell_actions_a_del.setAttribute('mrel_id', i);
        var cell_actions_i_del = document.createElement("i");
        cell_actions_i_del.setAttribute('class', 'material-icons');
        var cell_actions_i_del_text = document.createTextNode('\uE872');
        cell_actions_i_del.appendChild(cell_actions_i_del_text);
        cell_actions_a_del.appendChild(cell_actions_i_del);
        cell_actions.appendChild(cell_actions_a_del);

        $(cell_actions_a_del).click(function(e){
            var tgt = $(e.target);
            mrel_id = tgt.parent().attr('mrel_id');
            e.stopPropagation();
            confirm_modal_show('Are you sure you want to delete the relation ' + m_reg[m_reg_map[mrel_reg[mrel_id].m1]].disp
                + ' = &Otilde;(' + m_reg[m_reg_map[mrel_reg[mrel_id].m2]].disp + ')?',
                function() {
                    mrel_reg.splice(mrel_id, 1);
                    render_mrel_table();
                    recalc_mrel_shortest_paths();
                    render_primary_table();
                });
        });

        $(row).click(function(e){
            var tgt = $(e.target);
            if (e.target.nodeName === 'A' || (tgt.parent() && tgt.parent()[0].nodeName === 'A')) return;
            while (tgt.attr('mrel_id') === undefined) {
                tgt = tgt.parent();
                if (tgt === undefined) return;
            }
            mrel_id = tgt.attr('mrel_id');
            var is_target_row_selected = tgt.hasClass('mrel-table-select');
            sep_table.find('.sep-table-cell').removeClass('sep-table-select');
            msep_table.children('tr').removeClass('msep-table-select');
            mrel_table.children('tr').removeClass('mrel-table-select');
            if (!is_target_row_selected) {
                sep_table.find('.mrel-' + mrel_id).addClass('sep-table-select');
                tgt.addClass('mrel-table-select');
            }
            e.stopPropagation();
        });

        row.appendChild(cell_actions);
        mrel_table[0].appendChild(row);
    }
    update_mrel_tight_error();
};

var render_msep_table = function() {
    msep_table.empty();
    msep_table_header.empty();
    // Fill in header row, need to do so to dynamically add measures
    for (var i = 0; i < m_reg.length; i++) {
        var hrow = msep_table_header[0];
        var hcell_name = document.createElement("th");
        let hcell_name_text = document.createTextNode("Name");
        hcell_name.appendChild(hcell_name_text);
        hrow.appendChild(hcell_name);

        // Add each measure
        for (var i = 0; i < m_reg.length; i++) {
            var hcell = document.createElement("th");
            hcell.setAttribute('measure_id', m_reg[i].id);
            hcell.setAttribute('class', "measure");
            $(hcell).html(m_reg[i].disp);
            hrow.appendChild(hcell);
        }

        var hcell_desc = document.createElement("th");
        let hcell_desc_text = document.createTextNode("Description");
        hcell_desc.appendChild(hcell_desc_text);
        hrow.appendChild(hcell_desc);

        var hcell_attrib = document.createElement("th");
        let hcell_attrib_text = document.createTextNode("Attribution");
        hcell_attrib.appendChild(hcell_attrib_text);
        hrow.appendChild(hcell_attrib);

        // Column for actions
        var hcell_actions = document.createElement("th");
        hcell_actions.setAttribute('class', 'actions-column');
        hrow.appendChild(hcell_actions);
    }

    // Make the table body
    for (var i = 0; i < msep_reg.length; i++) {
        var entry = msep_reg[i];

        // A row for each function
        var row = document.createElement("tr");
        row.id = 'msep-row-' + i;
        row.setAttribute('msep-id', i);
        var cell_name = document.createElement("td");
        cell_name.setAttribute('class', 'measure');
        $(cell_name).html(entry.name)
        row.appendChild(cell_name);

        // Cell for each measure
        for (var j = 0; j < m_reg.length; j++) {
            var cell = document.createElement("td");
            cell.setAttribute('measure-id', j);
            cell.setAttribute('class', 'msep-measure-cell');
            var $cell = $(cell);
            if (entry[m_reg[j].id] != undefined) {
                var m_entry = entry[m_reg[j].id];
                var txt = '';
                var lower_inv = isNaN(m_entry.lower) || m_entry.lower === Infinity || m_entry.lower == null;
                var upper_inv = isNaN(m_entry.upper) || m_entry.upper === Infinity || m_entry.upper == null;
                if (lower_inv && upper_inv) {
                    txt = '';
                } else if (lower_inv) {
                    txt = '&le; ' + format_asymptotic_num(m_entry.upper);
                } else if (upper_inv) {
                    txt = '&ge; ' + format_asymptotic_num(m_entry.lower);
                } else if (m_entry.lower === m_entry.upper) {
                    txt = format_asymptotic_num(m_entry.lower);
                } else {
                    txt = '&ge; ' + format_asymptotic_num(m_entry.lower) + '; &le; ' + format_asymptotic_num(m_entry.upper);
                }
                $cell.html(txt);
            }

            $cell.click(function(e){
                // Show "edit complexity of" box upon clicking cell
                e.stopPropagation();
                $targ = $(e.target);
                while ($targ !== undefined &&
                    $targ.length > 0 &&
                    $targ[0].nodeName !== 'TD') {
                    $targ = $targ.parent();
                }
                var m_id = parseInt($targ.attr('measure-id'));
                var sep_id = parseInt($targ.parent().attr('msep-id'));
                // For safety
                if (m_reg[m_id] == undefined || msep_reg[sep_id] === undefined) return;

                var pop = $('#msep-popup');
                $('#msep-popup-error').text('');

                _msep_popup_sep_data = { sep: sep_id, meas: m_id };

                var entry = msep_reg[sep_id][m_reg[m_id].id];
                var lower_valid = entry !== undefined && entry.lower !== undefined && entry.lower !== null;
                var upper_valid = entry !== undefined && entry.upper !== undefined && entry.upper !== null;
                var lb_box = $('#msep-popup-lb');
                var ub_box = $('#msep-popup-ub');
                $('#msep-popup-func-name').html(msep_reg[sep_id].name);
                $('#msep-popup-measure').html(m_reg[m_id].disp);
                lb_box[0].value = lower_valid ? entry.lower : '';
                ub_box[0].value = upper_valid ? entry.upper : '';
                if ((lower_valid && entry.lower === entry.upper) || (!upper_valid && !lower_valid)) {
                    $('#msep-popup-same')[0].checked = true;
                    ub_box.attr('disabled', true);
                } else {
                    $('#msep-popup-same')[0].checked = false;
                    ub_box.removeAttr('disabled');
                }
                var off = $targ.offset();

                off.top += $targ.height() + 5;
                var sep_table = $('#msep-table');
                if (off.top + pop.height() > sep_table.offset().top + sep_table.height()) {
                    off.top -= $targ.height() + pop.height() + 30;
                }

                var win_wid = $(window).width();
                var pop_wid = pop.width() + 30;
                if (off.left + pop_wid > win_wid) {
                    off.left = win_wid - pop_wid
                }
                pop.css('display', 'block');
                pop.offset(off);

            });
            row.appendChild(cell);
        }
        var cell_desc = document.createElement("td");
        $(cell_desc).html(entry.desc)
        row.appendChild(cell_desc);

        var cell_attr = document.createElement("td");
        // Attributions
        for (var j = 0; j < entry.attrib.length; ++j) {
            if (j > 0) {
                var pad_text = document.createTextNode(', ');
                cell_attr.appendChild(pad_text);
            }

            if (j >= entry.url.length || entry.url[j] === '' ||
                entry.url[j] === undefined) {
                var cell_attr_text = document.createTextNode(entry.attrib[j]);
                cell_attr.appendChild(cell_attr_text);
            } else {
                var cell_attr_a = document.createElement("a");
                var cell_attr_text = document.createTextNode(entry.attrib[j]);
                cell_attr_a.appendChild(cell_attr_text);
                cell_attr_a.setAttribute('href', entry.url[j]);
                cell_attr.appendChild(cell_attr_a);
            }
        }
        row.appendChild(cell_attr);

        var cell_actions = document.createElement("td");

        var cell_actions_a_complete = document.createElement("a");
        cell_actions_a_complete.setAttribute('title', "Autofill all measures for this function i.e. try to fill in other complexity measures " +
            "based on existing information and known relations between measures. E.g. if known R(f) > n^0.5 then automatically adds R0(f) > n^0.5");
        cell_actions_a_complete.setAttribute('class', 'table-action complete');
        cell_actions_a_complete.setAttribute('msep_id', i);
        var cell_actions_i_complete = document.createElement("i");
        cell_actions_i_complete.setAttribute('class', 'material-icons');
        var cell_actions_i_complete_text = document.createTextNode('\uE627');
        cell_actions_i_complete.appendChild(cell_actions_i_complete_text);
        cell_actions_a_complete.appendChild(cell_actions_i_complete);
        cell_actions.appendChild(cell_actions_a_complete);

        $(cell_actions_a_complete).click(function(e){
            $('#msep-popup').css('display', 'none');
            var tgt = $(e.target);
            var sep_id = parseInt(tgt.parent().attr('msep_id'));
            e.stopPropagation();
            if (sep_id === undefined) return;

            autofill_func(sep_id);

            recalc_msep(sep_id);
            update_mrel_tight_error();
            render_msep_table();
            render_primary_table();
        });

        var cell_actions_a_edit = document.createElement("a");
        cell_actions_a_edit.setAttribute('title', "Edit function metadata (click on a cell in one of the columns on the left side to edit the complexity measure value)");
        cell_actions_a_edit.setAttribute('class', 'table-action edit');
        cell_actions_a_edit.setAttribute('msep_id', i);
        var cell_actions_i_edit = document.createElement("i");
        cell_actions_i_edit.setAttribute('class', 'material-icons');
        var cell_actions_i_edit_text = document.createTextNode('\uE3C9');
        cell_actions_i_edit.appendChild(cell_actions_i_edit_text);
        cell_actions_a_edit.appendChild(cell_actions_i_edit);
        cell_actions.appendChild(cell_actions_a_edit);

        $(cell_actions_a_edit).click(function(e){
            $('#msep-popup').css('display', 'none');
            var tgt = $(e.target);
            var msep_id = tgt.parent().attr('msep_id');
            e.stopPropagation();
            if (msep_id === undefined) return;
            var msep_txt = $('#msep-add-text');
            var msep_add_btn = $('#msep-add-btn');
            msep_txt.html('Edit function metadata, row ' + msep_id);
            msep_add_btn.text('Update');
            $(document).scrollTop(msep_txt.offset().top - $(window).height() / 3);

            _msep_pre_edit_data = { name: $('#msep-name')[0].value, desc: $('#msep-desc')[0].value,
                attrib: $('#msep-attrib')[0].value, url: $('#msep-urls')[0].value };

            $('#msep-name')[0].value = msep_reg[msep_id].name;
            $('#msep-desc')[0].value = msep_reg[msep_id].desc;
            var attrib_txt = '';
            if (msep_reg[msep_id].attrib !== undefined) {
                for (var i = 0; i < msep_reg[msep_id].attrib.length; i++) {
                    attrib_txt += msep_reg[msep_id].attrib[i] + '\n';
                }
            }
            $('#msep-attrib')[0].value = attrib_txt;

            var urls_txt = '';
            if (msep_reg[msep_id].url !== undefined) {
                for (var i = 0; i < msep_reg[msep_id].url.length; i++) {
                    urls_txt += msep_reg[msep_id].url[i] + '\n';
                }
            }
            $('#msep-urls')[0].value = urls_txt;
            _msep_edit_id = msep_id;
            $('#msep-add-section').addClass('editing');
            $('#msep-add-error').empty();
        });

        var cell_actions_a_del = document.createElement("a");
        cell_actions_a_del.setAttribute('title', "Delete function");
        cell_actions_a_del.setAttribute('class', 'table-action delete');
        cell_actions_a_del.setAttribute('msep-id', i);
        var cell_actions_i_del = document.createElement("i");
        cell_actions_i_del.setAttribute('class', 'material-icons');
        var cell_actions_i_del_text = document.createTextNode('\uE872');
        cell_actions_i_del.appendChild(cell_actions_i_del_text);
        cell_actions_a_del.appendChild(cell_actions_i_del);
        cell_actions.appendChild(cell_actions_a_del);

        $(cell_actions_a_del).click(function(e){
            var tgt = $(e.target);
            msep_id = tgt.parent().attr('msep-id');
            e.stopPropagation();
            confirm_modal_show('Are you sure you want to delete the function ' + msep_reg[msep_id].name + '?',
                function() {
                    $('#msep-popup').css('display', 'none');
                    msep_id = tgt.parent().attr('msep-id');
                    msep_reg.splice(msep_id, 1);
                    recalc_msep_all();
                    update_mrel_tight_error();
                    render_msep_table();
                    render_primary_table();
                });
        });

        $(row).click(function(e){
            var tgt = $(e.target);
            if (e.target.nodeName === 'A' || (tgt.parent() && tgt.parent()[0].nodeName === 'A')) return;
            while (tgt.attr('msep-id') === undefined) {
                tgt = tgt.parent();
                if (tgt === undefined) return;
            }
            msep_id = tgt.attr('msep-id');
            var is_target_row_selected = tgt.hasClass('msep-table-select');
            sep_table.find('.sep-table-cell').removeClass('sep-table-select');
            msep_table.children('tr').removeClass('msep-table-select');
            mrel_table.children('tr').removeClass('mrel-table-select');
            if (!is_target_row_selected) {
                sep_table.find('.msep-' + msep_id).addClass('sep-table-select');
                tgt.addClass('msep-table-select');
            }
            e.stopPropagation();
        });

        row.appendChild(cell_actions);

        msep_table[0].appendChild(row);
    }
};

$(document).ready(function(){
    sep_table = $('#sep-table');
    msep_table = $('#msep-table-body');
    msep_table_header = $('#msep-table-header-row');
    mrel_table = $('#mrel-table-body');
    popup = $('#popup');

    if (!persistence_read()) {
        reload_default_rels_seps();
    } else {
        render_mrel_table();
        render_msep_table();
        render_primary_table();
    }

    $('#popup-close-btn').click(function(e) {
        popup.css('display', 'none');
        var all_cells = sep_table.find('.sep-table-cell');
        all_cells.removeClass('sep-table-inspect');
        all_cells.removeClass('sep-table-inspect-path');
        e.stopPropagation();
    });

    $('.confirm-modal-cancel').click(function(e) {
        confirm_modal.css('display', 'none');
        e.stopPropagation();
    });

    $('#confirm-modal-yes-btn').click(function(e) {
        confirm_modal.css('display', 'none');
        e.stopPropagation();
        if (_confirm_modal_calmsepack !== null) {
            _confirm_modal_calmsepack();
        }
    });

    var split_helper = function(lines) {
        return lines.split('\n')
            .filter(function (el) { return el != ''; })
            .map(function(el) { return el.trim(); });
    };

    var download = function(filename, text) {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    };

    $('#mrel-add-btn').click(function(e) {
        e.stopPropagation();
        var m1 = $('#mrel-m1')[0].value;
        var m2 = $('#mrel-m2')[0].value;
        var expon = parseFloat($('#mrel-expon')[0].value);
        $('#mrel-add-error').empty();
        if (isNaN(expon) || expon === Infinity || expon <= 0.0) {
            $('#mrel-add-error').text('Invalid exponent value');
            return;
        }
        if (m1 === m2) {
            $('#mrel-add-error').html('Cannot create a relation between a measure and itself')
            return;
        }
        var desc = $('#mrel-desc')[0].value;

        var attrib = split_helper($('#mrel-attrib')[0].value);
        var urls = split_helper($('#mrel-urls')[0].value);

        if (_mrel_edit_id != null) {
            $('#mrel-add-text').html('Add Relation: M1 = &Otilde;(M2<sup>X</sup>)');
            $('#mrel-add-btn').text('Add');
            update_mrel(_mrel_edit_id, m1, m2, expon, desc, attrib, urls);
            $(document).scrollTop($('#mrel-row-' + _mrel_edit_id ).offset().top - 150);
            _mrel_edit_id = null;
            $('#mrel-m1')[0].value = _mrel_pre_edit_data.m1;
            $('#mrel-m2')[0].value = _mrel_pre_edit_data.m1;
            $('#mrel-expon')[0].value = _mrel_pre_edit_data.expon;
            $('#mrel-desc')[0].value = _mrel_pre_edit_data.desc;
            $('#mrel-attrib')[0].value = _mrel_pre_edit_data.attrib;
            $('#mrel-urls')[0].value = _mrel_pre_edit_data.url;
            $('#mrel-add-section').removeClass('editing');
            _mrel_pre_edit_data = null;
        } else {
            register_mrel(m1, m2, expon, desc, attrib, urls);
            $(document).scrollTop($('#mrel-form').offset().top - $(window).height() + 150);
        }
        render_mrel_table();
        recalc_mrel_shortest_paths();
        render_primary_table();
    });

    $('#mrel-cancel-btn').click(function(e) {
        if (_mrel_edit_id != null) {
            confirm_modal_show("Cancel edit?", function(){
                $('#mrel-add-text').html('Add Relation: M1 = &Otilde;(M2<sup>X</sup>)');
                $('#mrel-add-btn').text('Add');
                _mrel_edit_id = null;
                $('#mrel-m1')[0].value = _mrel_pre_edit_data.m1;
                $('#mrel-m2')[0].value = _mrel_pre_edit_data.m1;
                $('#mrel-expon')[0].value = _mrel_pre_edit_data.expon;
                $('#mrel-desc')[0].value = _mrel_pre_edit_data.desc;
                $('#mrel-attrib')[0].value = _mrel_pre_edit_data.attrib;
                $('#mrel-urls')[0].value = _mrel_pre_edit_data.url;
                $('#mrel-add-section').removeClass('editing');
                $('#mrel-add-error').text('');
                _mrel_pre_edit_data = null;
            });
        } else {
            confirm_modal_show("Reset add relation form?", function(){
                $('#mrel-m1')[0].value = 'D';
                $('#mrel-m2')[0].value = 'D';
                $('#mrel-expon')[0].value = 1;
                $('#mrel-desc')[0].value = '';
                $('#mrel-attrib')[0].value = '';
                $('#mrel-urls')[0].value = '';
                $('#mrel-add-error').text('');
            });
        }
    });

    $('#msep-add-btn').click(function(e) {
        e.stopPropagation();
        $('#msep-popup').css('display', 'none');
        $('#msep-add-error').empty();
        var name = $('#msep-name')[0].value.trim();
        var desc = $('#msep-desc')[0].value.trim();

        if (name === '') {
            $('#msep-add-error').html('Function name cannot be empty')
            return;
        }
        var changed_name = (_msep_edit_id === null || msep_reg[_msep_edit_id].name !== name);
        if (msep_reg_map[name] !== undefined && changed_name) {
            $('#msep-add-error').html('A function with name "' + name + '" already exists')
            return;
        }

        var attrib = split_helper($('#msep-attrib')[0].value);
        var urls = split_helper($('#msep-urls')[0].value);
        if (attrib === undefined) {
            attrib = []; 
        }
        if (urls === undefined) {
            urls = []; 
        }

        if (_msep_edit_id !== null) {
            $('#msep-add-text').html('Add Function');
            $('#msep-add-btn').text('Add');
            msep_reg[_msep_edit_id].name = name;
            msep_reg[_msep_edit_id].desc = desc;
            msep_reg[_msep_edit_id].attrib = attrib;
            msep_reg[_msep_edit_id].url = urls;

            if (changed_name) {
                recalc_msep_all();
                update_mrel_tight_error();
            }

            $(document).scrollTop($('#msep-row-' + _msep_edit_id ).offset().top - 150);
            _msep_edit_id = null;
            $('#msep-name')[0].value = _msep_pre_edit_data.name;
            $('#msep-desc')[0].value = _msep_pre_edit_data.desc;
            $('#msep-attrib')[0].value = _msep_pre_edit_data.attrib;
            $('#msep-urls')[0].value = _msep_pre_edit_data.url;
            $('#msep-add-section').removeClass('editing');
            _msep_pre_edit_data = null;
        } else {
            register_msep(name, desc, attrib, urls);
            $(document).scrollTop($('#msep-form').offset().top - $(window).height() + 250);
        }
        render_msep_table();
        render_primary_table();
    });

    $('#msep-cancel-btn').click(function(e) {
        if (_msep_edit_id != null) {
            confirm_modal_show("Cancel edit?", function(){
                $('#msep-add-text').html('Add Relation: M1 = &Otilde;(M2<sup>X</sup>)');
                $('#msep-add-btn').text('Add');
                _msep_edit_id = null;
                $('#msep-name')[0].value = _msep_pre_edit_data.name;
                $('#msep-desc')[0].value = _msep_pre_edit_data.desc;
                $('#msep-attrib')[0].value = _msep_pre_edit_data.attrib;
                $('#msep-urls')[0].value = _msep_pre_edit_data.url;
                $('#msep-add-section').removeClass('editing');
                $('#msep-add-error').text('');
                _msep_pre_edit_data = null;
            });
        } else {
            confirm_modal_show("Reset add separation form?", function(){
                $('#msep-name')[0].value = '';
                $('#msep-desc')[0].value = '';
                $('#msep-attrib')[0].value = '';
                $('#msep-urls')[0].value = '';
                $('#msep-add-error').text('');
            });
        }
    });

    $('#clear-btn').click(function(e) {
        confirm_modal_show('This will clear all relations, and separations, are you sure?', clear_all_rels_seps);
        e.stopPropagation();
    });

    $('#reset-btn').click(function(e) {
        confirm_modal_show('This will restore measures, relations, and separations to the defaults, are you sure?', reset_all);
        e.stopPropagation();
    });

    $('#export-btn').click(function(e) {
        var now_str = new Date().toLocaleString().replace(/ /g, '_').replace(',', '');
        download('bfcm_export_' + now_str + '.json', JSON.stringify(JSON.parse(window.localStorage.getItem(local_storage_reg_name)), null, 2));
    });

    $('#import-btn').click(function(e) {
        var err_txt = $('#import-error');
        err_txt.text('');
        var files = $('#import-file')[0].files;
        if (files.length === 0) return;

        var reader = new FileReader();
        reader.onload = function(event) {
            var content = event.target.result;
            try {
                var regdata = JSON.parse(content);
                if (regdata.meas === undefined ||
                    regdata.rel === undefined ||
                    regdata.sep === undefined) {
                    err_txt.text('Invalid JSON structure');
                    return;
                }
            } catch (e) {
                err_txt.text('File is not in JSON format');
                return;
            }
            window.localStorage.setItem(local_storage_reg_name, JSON.stringify(regdata));
            persistence_read();
            render_all();
            $('#import-file').siblings(".custom-file-label").html('Import json success');
        };
        reader.readAsText(files[0]);
    });

    $('#msep-popup-same').change(function(e) {
        if (e.target.checked) {
            $('#msep-popup-ub').attr('disabled', true);
        } else {
            $('#msep-popup-ub').removeAttr('disabled');
        }
        e.stopPropagation();
    });

    $('.msep-popup-cancel').click(function(e) {
        $('#msep-popup').css('display', 'none');
        _msep_popup_sep_data = null;
        e.stopPropagation();
    });

    $("#msep-popup-auto-btn").click(function(e){
        $('#msep-popup-error').text('');
        var sep_id = _msep_popup_sep_data.sep;
        var m_id = _msep_popup_sep_data.meas;
        var m_symb_id = m_reg[m_id].id;
        var ub_box = $('#msep-popup-ub');

        var lb = $('#msep-popup-lb')[0].value.trim();
        var ub = ub_box[0].value.trim();
        var ub_same = $('#msep-popup-same')[0].checked;
        if (ub_same) ub = lb;
        if (lb === '') lb = undefined;
        else lb = parseFloat(lb);
        if (ub === '') ub = undefined;
        else ub = parseFloat(ub);

        for (var j = 0; j < m_reg.length; j++) {
            if (m_id == j) continue;
            var mj_symb_id = m_reg[j].id;
            var entry = msep_reg[sep_id][mj_symb_id];
            if (entry === undefined) continue;
            var entry_lower_valid = entry.lower !== undefined && entry.lower !== null;
            var entry_upper_valid = entry.upper !== undefined && entry.upper !== null;

            var expon_from = mrel_dists[j][m_id][0];
            if (!isNaN(expon_from) && expon_from !== Infinity && entry_lower_valid) {
                if (lb === undefined || lb < entry.lower / expon_from) {
                    lb = entry.lower / expon_from;
                }
            }

            var expon_to = mrel_dists[m_id][j][0];
            if (!isNaN(expon_to) && expon_to !== Infinity && entry_upper_valid) {
                if (ub === undefined || ub > entry.upper * expon_to) {
                    ub = entry.upper * expon_to;
                }
            }
        }

        if (lb !== undefined) {
            $('#msep-popup-lb')[0].value = lb;
        }
        if (ub !== undefined) {
            $('#msep-popup-ub')[0].value = ub;
        }
        if (lb === ub) {
            $('#msep-popup-same')[0].checked = true;
            ub_box.attr('disabled', true);
        } else {
            $('#msep-popup-same')[0].checked = false;
            ub_box.removeAttr('disabled');
        }
    });

    $('#msep-popup-update-btn').click(function(e) {
        $('#msep-popup-error').text('');
        if (_msep_popup_sep_data !== null) {
            var lb = $('#msep-popup-lb')[0].value.trim();
            var ub = $('#msep-popup-ub')[0].value.trim();
            var ub_same = $('#msep-popup-same')[0].checked;
            if (ub_same) ub = lb;
            lb = lb === '' ? null : parseFloat(lb);
            ub = ub === '' ? null : parseFloat(ub);
            var sep_id = _msep_popup_sep_data.sep;
            var m_id = _msep_popup_sep_data.meas;
            if (isNaN(lb) || lb === Infinity || lb === -Infinity) {
                $('#msep-popup-error').text('The lower bound is an invalid number')
                return;
            }
            if (isNaN(ub) || ub === Infinity || lb === -Infinity) {
                $('#msep-popup-error').text('The upper bound is an invalid number')
                return;
            }
            if (lb !== null && ub !== null && lb > ub) {
                $('#msep-popup-error').text('The upper bound cannot be greater than the lower bound')
                return;
            }
            msep_reg[sep_id][m_reg[m_id].id] = {};
            if (lb !== null) {
                msep_reg[sep_id][m_reg[m_id].id].lower = lb;
            }
            if (ub !== null) {
                msep_reg[sep_id][m_reg[m_id].id].upper = ub;
            }
            recalc_msep(sep_id);
            render_msep_table();
            update_mrel_tight_error();
            render_primary_table();
        }
        $('#msep-popup').css('display', 'none');
        _msep_popup_sep_data = null;
        e.stopPropagation();
    });

    $('#msep-complete-all-btn').click(function(e) {
        autofill_all_funcs();
        recalc_msep_all();
        render_msep_table();
        update_mrel_tight_error();
        render_primary_table();
    });
    $(".custom-file-input").on("change", function() {
        var fileName = $(this).val().split("\\").pop();
        $(this).siblings(".custom-file-label").addClass("selected").html(fileName);
    });
});
//})();
