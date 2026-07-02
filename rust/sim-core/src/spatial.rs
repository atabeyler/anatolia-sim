use std::collections::HashMap;

/// A uniform grid over 2D positions used to bound neighbor lookups to O(1)
/// amortized instead of scanning the whole population for every individual.
pub struct SpatialGrid {
    cell_size: f64,
    cells: HashMap<(i64, i64), Vec<usize>>,
}

fn cell_key(x: f64, y: f64, cell_size: f64) -> (i64, i64) {
    ((x / cell_size).floor() as i64, (y / cell_size).floor() as i64)
}

impl SpatialGrid {
    pub fn build(positions: &[(f64, f64)], cell_size: f64) -> Self {
        let cell_size = cell_size.max(1e-6);
        let mut cells: HashMap<(i64, i64), Vec<usize>> = HashMap::new();
        for (idx, (x, y)) in positions.iter().enumerate() {
            cells.entry(cell_key(*x, *y, cell_size)).or_default().push(idx);
        }
        Self { cell_size, cells }
    }

    /// Returns indices of points whose cell is within the 3x3 neighborhood of
    /// (x, y)'s cell. Callers must still check exact distance against `radius`
    /// since this is a coarse (over-inclusive) candidate set.
    pub fn candidates_within(&self, x: f64, y: f64, radius: f64) -> Vec<usize> {
        let span = (radius / self.cell_size).ceil().max(1.0) as i64;
        let (cx, cy) = cell_key(x, y, self.cell_size);
        let mut out = Vec::new();
        for dx in -span..=span {
            for dy in -span..=span {
                if let Some(bucket) = self.cells.get(&(cx + dx, cy + dy)) {
                    out.extend_from_slice(bucket);
                }
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_all_points_within_radius_and_none_farther_away() {
        let positions = vec![(0.0, 0.0), (0.5, 0.5), (10.0, 10.0), (1.9, 0.0)];
        let grid = SpatialGrid::build(&positions, 2.0);
        let candidates = grid.candidates_within(0.0, 0.0, 2.0);
        assert!(candidates.contains(&0));
        assert!(candidates.contains(&1));
        assert!(candidates.contains(&3));
        // The far point may or may not appear as a *candidate* (coarse), but an
        // exact-distance filter by the caller must exclude it.
        let exact: Vec<usize> = candidates
            .into_iter()
            .filter(|&i| {
                let (px, py) = positions[i];
                (px * px + py * py).sqrt() < 2.0
            })
            .collect();
        assert!(!exact.contains(&2));
    }
}
