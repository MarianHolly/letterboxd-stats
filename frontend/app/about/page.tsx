"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            About Letterboxd Stats
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
            Transform your Letterboxd viewing history into beautiful, interactive analytics and insights.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* What is Letterboxd Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">What is Letterboxd Stats?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700 dark:text-slate-300">
                Letterboxd Stats is a free web application that provides comprehensive analytics for your Letterboxd viewing history.
                Whether you're a casual movie watcher or a serious cinephile, our tool helps you understand your movie-watching patterns and discover new insights.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                Simply upload your Letterboxd CSV export and watch as we enrich your data with information from The Movie Database (TMDB),
                including genres, directors, cast, runtime, and much more.
              </p>
            </CardContent>
          </Card>

          {/* Why We Built This */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Why We Built This</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700 dark:text-slate-300">
                While Letterboxd offers premium analytics, we wanted to create an even more powerful, free alternative that goes beyond
                basic statistics. Our goal is to provide:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-3 mt-1">✓</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    <strong>Free Access:</strong> No premium subscription needed
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-3 mt-1">✓</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    <strong>Enhanced Analytics:</strong> Beyond what Letterboxd Pro offers
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-3 mt-1">✓</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    <strong>Rich Visualizations:</strong> Beautiful, interactive charts
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-3 mt-1">✓</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    <strong>Enriched Data:</strong> TMDB integration for comprehensive movie information
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Key Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Key Features</CardTitle>
              <CardDescription>What you get with Letterboxd Stats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">📊 Analytics Dashboard</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    View comprehensive statistics about your watching habits, including most-watched genres and directors.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">🎬 Movie Data Enrichment</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Automatic TMDB integration provides genres, directors, cast, runtime, budgets, and more.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">📈 Viewing Trends</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Track your movie-watching trends over time and discover patterns in your viewing preferences.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">🔐 Privacy First</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Your data stays private and secure. We never share your information with third parties.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technology Stack */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Built With Modern Technology</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Frontend</h4>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                    <li>• Next.js 15 with TypeScript</li>
                    <li>• React 19</li>
                    <li>• Tailwind CSS</li>
                    <li>• Recharts for visualizations</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Backend & Database</h4>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                    <li>• FastAPI (Python)</li>
                    <li>• PostgreSQL</li>
                    <li>• TMDB API Integration</li>
                    <li>• Docker containerization</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-4">
                <li className="flex">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center mr-3">
                    1
                  </span>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Export Your Data</h4>
                    <p className="text-slate-600 dark:text-slate-400">
                      Download your Letterboxd data from Settings → Import & Export
                    </p>
                  </div>
                </li>
                <li className="flex">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center mr-3">
                    2
                  </span>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Upload CSV Files</h4>
                    <p className="text-slate-600 dark:text-slate-400">
                      Upload your CSV files to our platform and create a new session
                    </p>
                  </div>
                </li>
                <li className="flex">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center mr-3">
                    3
                  </span>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Automatic Enrichment</h4>
                    <p className="text-slate-600 dark:text-slate-400">
                      Our system automatically enriches your data with TMDB information
                    </p>
                  </div>
                </li>
                <li className="flex">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center mr-3">
                    4
                  </span>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Explore Your Stats</h4>
                    <p className="text-slate-600 dark:text-slate-400">
                      View beautiful visualizations and insights about your movie-watching habits
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Privacy & Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Privacy & Data Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700 dark:text-slate-300">
                Your privacy is our top priority. Here's what you need to know:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">✓</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    <strong>Your data stays with you:</strong> All analytics are user-specific and isolated
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">✓</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    <strong>No third-party sharing:</strong> Your viewing history is never shared or sold
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">✓</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    <strong>Secure authentication:</strong> Your account is protected with industry-standard encryption
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">✓</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    <strong>Delete anytime:</strong> You can request deletion of all your data at any time
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
