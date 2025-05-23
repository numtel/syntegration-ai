// ===== ICOSAHEDRON STRUCTURE WITH COLORS =====
const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio

let vertices = [
    // Upper pole (0: White)
    [phi, 1, 0],
    // Upper pentagon (1-5: Red, Orange, Purple, Light Blue, Green)
    [phi, -1, 0], [1, 0, phi], [0, phi, 1], [0, phi, -1], [1, 0, -phi],
    // Lower pentagon (6-10: Brown, Yellow, Gold, Dark Blue, Silver)
    [0, -phi, -1], [0, -phi, 1], [-1, 0, phi], [-phi, 1, 0], [-1, 0, -phi],
    // Lower pole (11: Black)
    [-phi, -1, 0]
];

// Normalize all vertices to unit sphere
const norm = Math.sqrt(vertices[0][0]**2 + vertices[0][1]**2 + vertices[0][2]**2);
vertices = vertices.map(vertex => vertex.map(coord => coord / norm));

const edges = [
    [0,1], [0,2], [0,3], [0,4], [0,5],   // Upper pole
    [1,2], [2,3], [3,4], [4,5], [5,1],    // Upper pentagon
    [1,6], [1,7], [2,7], [2,8], [3,8],    // Middle connections
    [3,9], [4,9], [4,10], [5,10], [5,6],
    [6,7], [7,8], [8,9], [9,10], [10,6],  // Lower pentagon
    [6,11], [7,11], [8,11], [9,11], [10,11] // Lower pole
];

const node_colors = [
    "White", "Red", "Orange", "Purple", "Light Blue", "Green",
    "Brown", "Yellow", "Gold", "Dark Blue", "Silver", "Black"
];

// Color dict not directly used in this non-visualization version but kept for reference
const color_dict = {
    "White": "#F2F3F5", "Red": "#FF0000", "Orange": "#FFA500",
    "Purple": "#800080", "Light Blue": "#ADD8E6", "Green": "#00FF00",
    "Brown": "#A52A2A", "Yellow": "#FFFF00", "Gold": "#FFD700",
    "Dark Blue": "#00008B", "Silver": "#C0C0C0", "Black": "#000000"
};

// Process critic_roles to be keyed by sorted node pairs (as strings)
const critic_roles_input = {
    "0,1": [8,10], "0,2": [9,6], "0,3": [10,7], "0,4": [8,6], "0,5": [7,9],
    "1,2": [4,11], "2,3": [5,11], "3,4": [1,11], "4,5": [2,11], "5,1": [3,11],
    "1,6": [4,8], "2,7": [5,9], "3,8": [1,10], "4,9": [2,6], "5,10": [3,7],
    "6,7": [0,9], "7,8": [0,10], "8,9": [0,6], "9,10": [0,7], "10,6": [0,8],
    "6,11": [2,4], "7,11": [3,5], "8,11": [1,4], "9,11": [5,2], "10,11": [3,1],
    "1,7": [3,10], "2,8": [6,4], "3,9": [5,7], "4,10": [8,1], "5,6": [9,2],
};

const critic_roles = {};
for (const keyStr in critic_roles_input) {
    const edgeNodes = keyStr.split(',').map(Number);
    const critics = critic_roles_input[keyStr];
    const sortedKey = JSON.stringify(edgeNodes.slice().sort((a, b) => a - b));
    critic_roles[sortedKey] = critics;
}

// ===== SCORE CALCULATION =====
function compute_score(vote1, vote2) {
    return (100 - (10 - vote1)**2) + (100 - (10 - vote2)**2);
}

// Helper: Shuffle array in place (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Helper: Get k random unique elements from an array (or indices from 0 to maxVal-1)
function getRandomUniqueIndices(maxVal, k) {
    const indices = Array.from({ length: maxVal }, (_, i) => i);
    shuffleArray(indices);
    return indices.slice(0, k);
}


// ===== OPTIMIZATION =====
function optimize(participants, max_iter = 1500000) {
    // 1. Random initial setup
    let topics = Array.from({ length: 12 }, (_, i) => i);
    shuffleArray(topics);
    let strut_assignment = Array.from({ length: 30 }, (_, i) => i);
    shuffleArray(strut_assignment);

    // 2. Calculate initial total score
    let current_score = 0;
    for (let strut_idx = 0; strut_idx < 30; strut_idx++) {
        const [u, v] = edges[strut_idx];
        const person = strut_assignment[strut_idx];
        current_score += compute_score(participants[person][topics[u]],
                                       participants[person][topics[v]]);
    }

    let best_score = current_score;
    let best_topics = [...topics];
    let best_struts = [...strut_assignment];

    // 3. Enhanced simulated annealing parameters
    const initial_temp = 100.0;
    const final_temp = 0.5;
    let current_temp = initial_temp;
    const restart_interval = 30000;
    const adaptive_threshold = 40000;
    let last_improvement = 0;

    console.log("\nOptimization Progress:");
    console.log("Iteration  Best Score Current    Temp");
    console.log("-".repeat(45));

    // 4. Optimization loop
    for (let iteration = 0; iteration < max_iter; iteration++) {
        // Adaptive cooling schedule
        if (iteration % adaptive_threshold === 0) {
            if (iteration - last_improvement > adaptive_threshold) {
                current_temp *= 0.9995; // Accelerate cooling if stuck
            } else {
                current_temp = initial_temp * (0.999995 ** iteration); // Standard
            }
        }
        current_temp = Math.max(current_temp, final_temp);

        // Periodic warm restarts
        if (iteration % restart_interval === 0 && iteration > 0) {
            current_temp = initial_temp * 1.0;
        }

        let delta = 0;
        // Random move selection (20% topic swaps, 80% participant swaps in this version)
        if (Math.random() < 0.2) { // Swap topics
            const [u_node_idx, v_node_idx] = getRandomUniqueIndices(12, 2);
            
            // Calculate delta efficiently
            delta = 0;
            const affected_struts_indices = [];
            for(let i=0; i < edges.length; i++) {
                if (edges[i].includes(u_node_idx) || edges[i].includes(v_node_idx)) {
                    affected_struts_indices.push(i);
                }
            }

            for (const strut_idx of affected_struts_indices) {
                const [a_node, b_node] = edges[strut_idx];
                const person = strut_assignment[strut_idx];
                const old_score_strut = compute_score(participants[person][topics[a_node]],
                                                  participants[person][topics[b_node]]);
                
                // Simulate swap for this strut's calculation
                let temp_topic_a = topics[a_node];
                let temp_topic_b = topics[b_node];

                if (a_node === u_node_idx) temp_topic_a = topics[v_node_idx];
                else if (a_node === v_node_idx) temp_topic_a = topics[u_node_idx];

                if (b_node === u_node_idx) temp_topic_b = topics[v_node_idx];
                else if (b_node === v_node_idx) temp_topic_b = topics[u_node_idx];
                
                const new_score_strut = compute_score(participants[person][temp_topic_a],
                                                  participants[person][temp_topic_b]);
                delta += new_score_strut - old_score_strut;
            }

            // Boltzmann acceptance criterion
            if (delta > 0 || Math.random() < Math.exp(delta / current_temp)) {
                [topics[u_node_idx], topics[v_node_idx]] = [topics[v_node_idx], topics[u_node_idx]]; // Actual swap
                current_score += delta;
                if (delta > 0) {
                    last_improvement = iteration;
                }
            }

        } else { // Swap people between struts
            const [strut_i_idx, strut_j_idx] = getRandomUniqueIndices(30, 2);
            const [u1, v1] = edges[strut_i_idx];
            const [u2, v2] = edges[strut_j_idx];
            const p1 = strut_assignment[strut_i_idx];
            const p2 = strut_assignment[strut_j_idx];

            const old_score_combined = compute_score(participants[p1][topics[u1]], participants[p1][topics[v1]]) +
                                     compute_score(participants[p2][topics[u2]], participants[p2][topics[v2]]);
            const new_score_combined = compute_score(participants[p1][topics[u2]], participants[p1][topics[v2]]) + // p1 gets strut j's topics
                                     compute_score(participants[p2][topics[u1]], participants[p2][topics[v1]]); // p2 gets strut i's topics
            delta = new_score_combined - old_score_combined;

            if (delta > 0 || Math.random() < Math.exp(delta / current_temp)) {
                [strut_assignment[strut_i_idx], strut_assignment[strut_j_idx]] = [strut_assignment[strut_j_idx], strut_assignment[strut_i_idx]];
                current_score += delta;
                if (delta > 0) {
                    last_improvement = iteration;
                }
            }
        }

        if (current_score > best_score) {
            best_score = current_score;
            best_topics = [...topics];
            best_struts = [...strut_assignment];
            
            console.log(
                `${String(iteration).padEnd(10)} ` +
                `${String(Math.floor(best_score)).padEnd(10)} ` +
                `${String(Math.floor(current_score)).padEnd(10)} ` +
                `${current_temp.toFixed(2).padEnd(10)}`
            );
        }
         if (iteration % 10000 === 0 && iteration != 0) { // Less frequent print for current status
             process.stdout.write(`Iteration: ${iteration}, Current Temp: ${current_temp.toFixed(2)}, Current Score: ${Math.floor(current_score)}, Best Score: ${Math.floor(best_score)}\r`);
         }
    }
    process.stdout.write("\n"); // New line after progress indicator
    return { best_topics, best_struts, best_score };
}

// ===== MAIN EXECUTION =====
export async function optimizer(participants_data) {
    console.log("\nRunning optimization...");
    const { best_topics, best_struts, best_score } = optimize(participants_data, 2200000); // Iteration count from Python call
    console.log(`\nOptimization complete. Best score: ${Math.floor(best_score)}`);

    const topic_labels = Array.from({ length: 12 }, (_, i) => String.fromCharCode(65 + i)); // A-L
    const results = [];

    for (let edge_idx = 0; edge_idx < 30; edge_idx++) {
        const person_idx = best_struts[edge_idx];
        const [node1, node2] = edges[edge_idx];

        const sorted_edge_key = JSON.stringify([node1, node2].slice().sort((a, b) => a - b));
        const critics_nodes = critic_roles[sorted_edge_key] || [null, null];
        
        const t1_idx = best_topics[node1]; // Actual topic index for node1
        const t2_idx = best_topics[node2]; // Actual topic index for node2
        
        const vote1 = participants_data[person_idx][t1_idx];
        const vote2 = participants_data[person_idx][t2_idx];
        
        results.push({
            'Participant': person_idx + 1,
            'ColorPair': `${node_colors[node1]}-${node_colors[node2]}`,
            'Topic1': topic_labels[t1_idx],
            'Topic2': topic_labels[t2_idx],
            'Critic1': critics_nodes[0] !== null ? node_colors[critics_nodes[0]] : "None",
            'Critic2': critics_nodes[1] !== null ? node_colors[critics_nodes[1]] : "None",
            'Vote1': vote1,
            'Vote2': vote2,
            'Score': compute_score(vote1, vote2),
            'LowScore': (vote1 < 6) || (vote2 < 6)
        });
    }

    return results;
}
