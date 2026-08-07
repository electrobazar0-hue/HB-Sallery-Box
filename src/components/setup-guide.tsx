'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, Key, RefreshCcw, ExternalLink, Check, AlertTriangle,
  ChevronRight, Copy, CheckCircle, Loader2, Server, Shield, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { fetchJSON } from '@/lib/utils';

interface SetupStep {
  id: number;
  title: string;
  description: string;
  details: string[];
  link?: { text: string; url: string };
  completed: boolean;
}

export function SetupGuide() {
  const [status, setStatus] = useState<'checking' | 'not-configured' | 'connected' | 'error'>('checking');
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const steps: SetupStep[] = [
    {
      id: 1,
      title: 'PostgreSQL Database Banao',
      description: 'Prisma ke liye PostgreSQL database create karo',
      details: [
        'Vercel Postgres, Neon, Railway, Render, ya kisi bhi PostgreSQL provider par database banao',
        'Region select karo (nearest to your users)',
        'Database password safe rakhna',
        'SSL enabled connection string use karo',
      ],
      link: { text: 'Neon free database ->', url: 'https://neon.tech' },
      completed: false,
    },
    {
      id: 2,
      title: 'Connection String Copy Karo',
      description: 'Provider dashboard se DATABASE_URL copy karo',
      details: [
        'Database provider dashboard me project open karo',
        'Connection string / pooled connection string copy karo',
        'Format aisa hoga: postgresql://user:password@host:5432/database?sslmode=require',
        'Yahi value Vercel me DATABASE_URL ke naam se add hogi',
      ],
      completed: false,
    },
    {
      id: 3,
      title: 'Vercel me Environment Variables Add Karo',
      description: 'Vercel project settings me 2 variables add karo',
      details: [
        'Vercel dashboard -> Apna Project -> Settings -> Environment Variables',
        'Variable 1: Name = DATABASE_URL, Value = copied connection string',
        'Variable 2: Name = NEXTAUTH_SECRET, Value = koi random string (e.g. hb-salary-box-secret-key-2024)',
        'Dono variables me "Production" select karo -> Save',
      ],
      link: { text: 'Vercel Dashboard ->', url: 'https://vercel.com/dashboard' },
      completed: false,
    },
    {
      id: 4,
      title: 'Redeploy Karo',
      description: 'Vercel pe redeploy karo taaki new env vars apply ho',
      details: [
        'Vercel dashboard -> Deployments tab',
        'Latest deployment pe "..." menu -> "Redeploy"',
        'Ya phir naya code push karo GitHub pe, auto-deploy hoga',
        'Redeploy ke baad ye page automatically database check karega',
      ],
      completed: false,
    },
  ];

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const checkConnection = async () => {
    setStatus('checking');
    try {
      const data = await fetchJSON('/api/setup');
      
      if (data?.success && data.connected) {
        setStatus('connected');
        toast({ title: 'Database Connected!', description: 'App is ready. Page reload ho rahi hai...' });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setStatus('not-configured');
      }
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    const init = async () => {
      await checkConnection();
    };
    init();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast({ title: 'Copied!' });
    setTimeout(() => setCopied(null), 2000);
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-700 dark:text-slate-300">Database check kar rahe hain...</p>
        </motion.div>
      </div>
    );
  }

  if (status === 'connected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-950 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mb-2">Database Connected!</h2>
          <p className="text-emerald-600 dark:text-emerald-400">Page reload ho rahi hai...</p>
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mt-4" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Setup Required
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Vercel pe database configure nahi hai. Niche 4 steps follow karo:
          </p>
        </motion.div>

        {/* Environment Variables Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                Required Environment Variables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border">
                <Database className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">DATABASE_URL</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-all">
                    postgresql://user:password@host/database?sslmode=require
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard('DATABASE_URL', 'dburl')}
                  className="shrink-0"
                >
                  {copied === 'dburl' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border">
                <Shield className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">NEXTAUTH_SECRET</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-all">
                    Koi random string (e.g. hb-salary-box-secret-2024)
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard('NEXTAUTH_SECRET', 'secret')}
                  className="shrink-0"
                >
                  {copied === 'secret' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + index * 0.1 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-start gap-4">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${
                      completedSteps.has(step.id) 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {completedSteps.has(step.id) ? <Check className="w-4 h-4" /> : step.id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm md:text-base">
                          {step.title}
                        </h3>
                        {step.link && (
                          <a
                            href={step.link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-1 shrink-0"
                          >
                            {step.link.text}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {step.description}
                      </p>
                      <ul className="mt-3 space-y-1.5">
                        {step.details.map((detail, i) => (
                          <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                            <ChevronRight className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Check Connection Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <Button 
            onClick={checkConnection}
            size="lg"
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Check Database Connection
          </Button>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            Env vars add karne ke baad ye button dabao
          </p>
        </motion.div>

        {/* Footer Info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Server className="w-3 h-3" /> PostgreSQL Required
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" /> Prisma Ready
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" /> SSL Required
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
