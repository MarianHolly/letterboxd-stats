# Implementation Priorities & Quick Start Guide

**Updated:** November 10, 2025
**Purpose:** Help you decide what to build next and how to get started

---

## 🎯 Decision Matrix: What Should You Build Next?

### Quick Scoring

**Impact Score:** How much value does this add? (1-10)
**Effort Score:** How much work is required? (1-10)
**Priority:** Impact/Effort ratio (higher is better)

| Feature | Impact | Effort | Priority | Duration | Next? |
|---------|--------|--------|----------|----------|-------|
| Genre Distribution Chart | 9 | 2 | **4.5** | 2 hours | ✅ YES |
| Rating Distribution Chart | 8 | 2 | **4.0** | 2 hours | ✅ YES |
| Viewing Over Time Chart | 9 | 3 | **3.0** | 3 hours | ✅ YES |
| Analytics Pages (Patterns, Genres) | 7 | 4 | **1.75** | 8 hours | ⏳ Later |
| User Authentication | 10 | 6 | **1.67** | 10 hours | ⏳ Later |
| Database Integration | 10 | 8 | **1.25** | 15 hours | ⏳ Later |
| Mobile Optimization | 6 | 4 | **1.50** | 5 hours | ⏳ Later |
| Export (PDF/CSV) | 5 | 5 | **1.0** | 6 hours | ❌ Last |
| Multi-file Upload | 4 | 5 | **0.8** | 6 hours | ❌ Last |

### ✅ RECOMMENDATION: Phase 1 (Complete Charts)

**Why:** Highest ROI, unblocks dashboard, quick wins
**Timeline:** 6-8 hours of focused work
**Order:** Genre → Rating → Viewing Over Time

---

## 📋 Detailed Task Breakdown

### Task 1: Genre Distribution Chart

**Difficulty:** Easy
**Time:** 2 hours
**Impact:** High (visualize favorite genres)

**Status:** Placeholder component exists at `frontend/components/dashboard/charts/genre-distribution.tsx`

**Steps:**

1. **Understand the data structure**
   ```typescript
   // From useAnalytics hook
   genreDistribution = {
     "Action": 120,
     "Drama": 95,
     "Comedy": 80,
     "Horror": 45,
     "Sci-Fi": 100,
     ...
   }
   ```

2. **Open the placeholder file**
   ```
   frontend/components/dashboard/charts/genre-distribution.tsx
   ```

3. **Implement the chart**
   ```tsx
   import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

   interface GenreDistributionProps {
     data: Record<string, number>;
   }

   export function GenreDistribution({ data }: GenreDistributionProps) {
     // Transform data from Record<string, number> to Array format
     const chartData = Object.entries(data).map(([name, value]) => ({
       name,
       value,
     }));

     // Take top 8 genres (or all if fewer)
     const topGenres = chartData.sort((a, b) => b.value - a.value).slice(0, 8);

     // Define colors
     const COLORS = [
       '#0088FE', '#00C49F', '#FFBB28', '#FF8042',
       '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C',
     ];

     return (
       <ResponsiveContainer width="100%" height={400}>
         <PieChart>
           <Pie
             data={topGenres}
             cx="50%"
             cy="50%"
             labelLine={false}
             label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
             outerRadius={120}
             fill="#8884d8"
             dataKey="value"
           >
             {topGenres.map((entry, index) => (
               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
             ))}
           </Pie>
           <Tooltip formatter={(value) => `${value} movies`} />
           <Legend />
         </PieChart>
       </ResponsiveContainer>
     );
   }
   ```

4. **Wire into dashboard**
   ```tsx
   // In frontend/app/dashboard/page.tsx, add:
   import { GenreDistribution } from "@/components/dashboard/charts/genre-distribution";

   // Inside the component:
   <DashboardSection title="Genre Distribution">
     <GenreDistribution data={analytics.genreDistribution} />
   </DashboardSection>
   ```

5. **Test**
   - Upload sample CSV
   - Verify chart displays
   - Test with different data sizes
   - Check responsive sizing

**Reference:** `NEXT_STEPS.md` section 1.3

---

### Task 2: Rating Distribution Chart

**Difficulty:** Easy
**Time:** 2 hours
**Impact:** High (show rating preferences)

**Status:** Placeholder component exists at `frontend/components/dashboard/charts/rating-distribution.tsx`

**Steps:**

1. **Understand the data structure**
   ```typescript
   // From useAnalytics hook
   ratingDistribution = {
     "1.0": 5,
     "2.0": 10,
     "3.0": 45,
     "3.5": 35,
     "4.0": 150,
     "4.5": 100,
     "5.0": 200,
   }
   ```

2. **Implement the chart**
   ```tsx
   import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

   interface RatingDistributionProps {
     data: Record<string, number>;
   }

   export function RatingDistribution({ data }: RatingDistributionProps) {
     // Transform data
     const chartData = Object.entries(data)
       .map(([rating, count]) => ({
         rating: `${rating}★`,
         count,
       }))
       .sort((a, b) => parseFloat(a.rating) - parseFloat(b.rating));

     return (
       <ResponsiveContainer width="100%" height={300}>
         <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
           <CartesianGrid strokeDasharray="3 3" />
           <XAxis dataKey="rating" />
           <YAxis />
           <Tooltip />
           <Bar dataKey="count" fill="#8884d8" radius={[8, 8, 0, 0]} />
         </BarChart>
       </ResponsiveContainer>
     );
   }
   ```

3. **Wire into dashboard**
   ```tsx
   // In frontend/app/dashboard/page.tsx, add:
   import { RatingDistribution } from "@/components/dashboard/charts/rating-distribution";

   // Inside the component:
   <DashboardSection title="Rating Distribution">
     <RatingDistribution data={analytics.ratingDistribution} />
   </DashboardSection>
   ```

4. **Test**
   - Verify bars display correctly
   - Check X-axis labels (ratings)
   - Verify Y-axis scales properly
   - Test responsive sizing

**Reference:** `NEXT_STEPS.md` section 1.2

---

### Task 3: Viewing Over Time Chart

**Difficulty:** Medium
**Time:** 3 hours
**Impact:** High (show viewing trends)

**Status:** Placeholder component exists at `frontend/components/dashboard/charts/viewing-over-time.tsx`

**Steps:**

1. **Understand the data structure**
   ```typescript
   // From useAnalytics hook
   moviesPerMonth = {
     "2023-01": 15,
     "2023-02": 12,
     "2023-03": 18,
     "2023-04": 20,
     ...
   }
   ```

2. **Create state for toggles**
   ```tsx
   interface ViewingOverTimeProps {
     data: Record<string, number>;
   }

   export function ViewingOverTime({ data }: ViewingOverTimeProps) {
     const [granularity, setGranularity] = useState<'yearly' | 'monthly' | 'weekly'>('monthly');
     const [timeRange, setTimeRange] = useState<'all' | '3years' | '12months'>('all');

     // TODO: Implement granularity conversion
     // TODO: Implement time range filtering
   ```

3. **Transform data based on granularity**
   ```tsx
   const getChartData = () => {
     const monthlyData = Object.entries(data).map(([month, count]) => ({
       month,
       count,
     }));

     if (granularity === 'yearly') {
       // Group by year: sum all months in each year
       const yearlyMap = new Map<string, number>();
       monthlyData.forEach(({ month, count }) => {
         const year = month.split('-')[0];
         yearlyMap.set(year, (yearlyMap.get(year) || 0) + count);
       });
       return Array.from(yearlyMap.entries()).map(([year, count]) => ({ month: year, count }));
     }

     // For monthly (default), use as-is
     return monthlyData;
   };
   ```

4. **Implement the area chart**
   ```tsx
   import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

   const chartData = getChartData();

   return (
     <div>
       {/* Toggles */}
       <div className="mb-4 flex gap-2">
         {/* Granularity buttons */}
         <Button
           variant={granularity === 'yearly' ? 'default' : 'outline'}
           onClick={() => setGranularity('yearly')}
         >
           Yearly
         </Button>
         {/* ... monthly, weekly buttons */}

         {/* Time range buttons */}
         <Button
           variant={timeRange === 'all' ? 'default' : 'outline'}
           onClick={() => setTimeRange('all')}
         >
           All Time
         </Button>
         {/* ... 3 years, 12 months buttons */}
       </div>

       {/* Chart */}
       <ResponsiveContainer width="100%" height={300}>
         <AreaChart data={chartData}>
           <defs>
             <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
               <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
               <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
             </linearGradient>
           </defs>
           <CartesianGrid strokeDasharray="3 3" />
           <XAxis dataKey="month" />
           <YAxis />
           <Tooltip />
           <Area
             type="monotone"
             dataKey="count"
             stroke="#8884d8"
             fillOpacity={1}
             fill="url(#colorCount)"
           />
         </AreaChart>
       </ResponsiveContainer>
     </div>
   );
   ```

5. **Test**
   - Verify chart displays
   - Test granularity toggles
   - Test time range filters
   - Check smooth transitions

**Reference:** `NEXT_STEPS.md` section 1.1

---

### Task 4: Wire Charts into Dashboard

**Difficulty:** Easy
**Time:** 1 hour

**Steps:**

1. **Open dashboard page**
   ```
   frontend/app/dashboard/page.tsx
   ```

2. **Import all charts**
   ```tsx
   import { GenreDistribution } from "@/components/dashboard/charts/genre-distribution";
   import { RatingDistribution } from "@/components/dashboard/charts/rating-distribution";
   import { ViewingOverTime } from "@/components/dashboard/charts/viewing-over-time";
   ```

3. **Add chart sections in render**
   ```tsx
   // After the Release Year Analysis section, add:

   <DashboardSection title="Genre Distribution">
     <GenreDistribution data={analytics.genreDistribution} />
   </DashboardSection>

   <DashboardSection title="Rating Distribution">
     <RatingDistribution data={analytics.ratingDistribution} />
   </DashboardSection>

   <DashboardSection title="Viewing Over Time">
     <ViewingOverTime data={analytics.moviesPerMonth} />
   </DashboardSection>
   ```

4. **Test in browser**
   - Verify all charts display
   - Check spacing/layout
   - Test responsiveness
   - Verify data accuracy

---

## 🧪 Testing Your Changes

### Manual Testing Steps

1. **Start the app**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Create test data** (save as `test-data.csv`)
   ```csv
   Name,Watched Date,Rating,Year,Genres
   The Matrix,2023-01-15,5,1999,Action|Sci-Fi|Thriller
   Inception,2023-02-12,4.5,2010,Action|Sci-Fi|Thriller
   The Dark Knight,2023-03-10,5,2008,Action|Crime|Drama
   Pulp Fiction,2023-04-05,4,1994,Crime|Drama
   Forrest Gump,2023-04-20,4,1994,Drama|Romance
   The Shawshank Redemption,2023-05-01,5,1994,Drama
   The Godfather,2023-05-15,5,1972,Crime|Drama
   Interstellar,2023-06-12,4.5,2014,Adventure|Drama|Sci-Fi
   The Avengers,2023-07-01,4,2012,Action|Adventure|Sci-Fi
   Titanic,2023-07-20,3.5,1997,Drama|Romance
   ```

3. **Upload the test file**
   - Go to http://localhost:3000
   - Upload test-data.csv
   - You should be redirected to /dashboard

4. **Verify charts**
   - Genre Distribution pie chart appears ✓
   - Rating Distribution bar chart appears ✓
   - Viewing Over Time area chart appears ✓
   - Release Year Analysis chart still works ✓

5. **Test interactivity**
   - Hover over chart elements
   - Check tooltips display
   - Test era filters on Release Year chart
   - Test toggles on Viewing Over Time chart

---

## 📊 Progress Tracking

Use this checklist to track your progress through Phase 1:

```
Phase 1: Complete Chart Implementation
├─ Genre Distribution Chart
│  ├─ [ ] Open placeholder file
│  ├─ [ ] Understand data structure
│  ├─ [ ] Implement PieChart component
│  ├─ [ ] Wire into dashboard
│  └─ [ ] Test with sample data
│
├─ Rating Distribution Chart
│  ├─ [ ] Open placeholder file
│  ├─ [ ] Understand data structure
│  ├─ [ ] Implement BarChart component
│  ├─ [ ] Wire into dashboard
│  └─ [ ] Test with sample data
│
├─ Viewing Over Time Chart
│  ├─ [ ] Open placeholder file
│  ├─ [ ] Understand data structure
│  ├─ [ ] Implement AreaChart with toggles
│  ├─ [ ] Implement granularity conversion
│  ├─ [ ] Implement time range filtering
│  ├─ [ ] Wire into dashboard
│  └─ [ ] Test with sample data
│
├─ Dashboard Integration
│  ├─ [ ] Import all chart components
│  ├─ [ ] Add sections to dashboard page
│  ├─ [ ] Verify layout/spacing
│  └─ [ ] Test responsive design
│
└─ Final Testing
   ├─ [ ] Test with real Letterboxd CSV
   ├─ [ ] Verify all 4 charts display correctly
   ├─ [ ] Test on mobile/tablet
   └─ [ ] Push to git with clean commit message
```

---

## 🚀 After Phase 1: What's Next?

Once charts are done (6-8 hours), you'll have achieved:
- ✅ Fully functional dashboard
- ✅ 4 interactive charts
- ✅ Ready to share MVP

**Then you can choose:**

### Option A: Continue Feature Development (Recommended)
- Implement additional dashboard pages (patterns, genres)
- Add settings page
- Improve mobile experience
- Add export functionality

### Option B: Start Backend Work (For scalability)
- Setup PostgreSQL database
- Implement user authentication
- Add data persistence
- Enable multi-file uploads

### Option C: Polish & Deploy
- Write tests
- Setup CI/CD
- Deploy to Vercel/Railway
- Make it public

---

## 📚 Resources & References

| Resource | Link | Purpose |
|----------|------|---------|
| Recharts Docs | https://recharts.org/ | Chart implementation |
| Next.js Docs | https://nextjs.org/ | Framework reference |
| Tailwind CSS | https://tailwindcss.com/ | Styling reference |
| NEXT_STEPS.md | ./NEXT_STEPS.md | Detailed roadmap |
| TECHNICAL_ANALYSIS.md | ./TECHNICAL_ANALYSIS.md | Full technical details |
| Code Examples | See prototype folders | Component examples |

---

## ⚡ Quick Commands

```bash
# Start frontend dev server
cd frontend && npm run dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build

# Lint code
npm run lint

# View component demos (if Storybook setup)
npm run storybook
```

---

## 💡 Pro Tips

1. **Start small:** Build one chart fully before moving to next
2. **Test frequently:** Upload test data after each change
3. **Use the browser devtools:** Inspect props/state while developing
4. **Reference release-year chart:** Already implemented, use as template
5. **Keep commits small:** One feature per commit makes history clean
6. **Ask questions:** Comment code if unclear, discuss design decisions
7. **Don't optimize prematurely:** Get it working first, optimize later

---

## ❓ FAQ

**Q: How do I know if my chart is correct?**
A: Upload test data, verify numbers match your manual calculation, check visual accuracy

**Q: What if the chart doesn't render?**
A: Check console for errors, verify data structure, ensure useAnalytics returns data

**Q: How long should Phase 1 actually take?**
A: 6-8 hours focused work, or 2-3 days with breaks, testing, and refinement

**Q: Can I do multiple charts in parallel?**
A: Better to do sequentially (one at a time) for cleaner commits and easier debugging

**Q: What's the hardest part?**
A: Viewing Over Time chart (due to granularity/filtering logic). Start with Genre & Rating first

---

**Good luck! 🚀 You've got this.**

Start with the Genre Distribution chart - it's the easiest win and will build confidence for the other two.
