import React from 'react';
import "./styles/LoginSignUp.css";
import LS_cust from './pages/customer/LS_cust';
import LS_Reps from './pages/agent/LS_Reps';
import Mytickets from "./pages/customer/Mytickets";
import Custhome from "./pages/customer/Custhome";
import Raiseticket from "./pages/customer/Raiseticket";
import ViewTicket from "./pages/customer/ViewTicket";
import CustNoti from "./pages/customer/CustNoti";
import { Routes, Route } from "react-router-dom";
import PrivateRoute from './components/PrivateRoute';
import AgentHome from './pages/agent/AgentHome';
import AgentTickets from "./pages/agent/AgentTickets";
import AgentUnassigned from "./pages/agent/AgentUnassigned";
import AgentPerf from "./pages/agent/AgentPerf";
import Agenthelp from "./pages/agent/Agenthelp";
import AgentNoti from "./pages/agent/AgentNoti";
import AgentTicketView from './pages/agent/AgentTicketView';
import ForgotPwd from './pages/ForgotPwd';
import ResetPwd from "./pages/ResetPwd";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerLogin from "./pages/manager/ManagerLogin";
import ManagerAllTickets from "./pages/manager/ManagerAllTickets";
import ManagerTicketView from "./pages/manager/ManagerTicketView";
import EscalationQueue from "./pages/manager/EscalationQueue";
import AgentRoster from "./pages/manager/AgentRoster";
import ManagerAgentDetail from "./pages/manager/ManagerAgentDetail";
import AcceptInvite from "./pages/agent/AcceptInvite";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";

function App() {
    return (
        <Routes>
            <Route path="/" element={<LS_cust />} />
            <Route path="/agent" element={<LS_Reps />} />
            <Route path="/forgot-pwd" element={<ForgotPwd />} />
            <Route path="/chome" element={
                <PrivateRoute role='customer'>
                    <Custhome />         // customer home page
                </PrivateRoute>
            } />
            <Route path="/mytickets" element={
                <PrivateRoute role='customer'>
                    <Mytickets />        //  customer tickets page
                </PrivateRoute>
            } />
            <Route path="/raiseticket" element={
                <PrivateRoute role='customer'>
                    <Raiseticket />      //  customer raise tickets page
                </PrivateRoute>
            } />
            <Route path="/ticket/:id" element={
                <PrivateRoute role='customer'>
                    <ViewTicket />       //  customer view tickets page
                </PrivateRoute>
            } />
            <Route path="/cnoti" element={
                <PrivateRoute role='customer'>
                    <CustNoti />
                </PrivateRoute>
            } />

            //agent pages starts here
            <Route path="/agent/ahome" element={
                <PrivateRoute role='agent'>
                    <AgentHome />        //  agent home page
                </PrivateRoute>
            } />
            <Route path='/agent/agenttickets' element={
                <PrivateRoute role='agent'>
                    <AgentTickets />
                </PrivateRoute>
            }
            />
            <Route path='/agent/unassigned' element={
                <PrivateRoute role='agent'>
                    <AgentUnassigned />
                </PrivateRoute>
            }
            />
            <Route path='/agent/noti' element={
                <PrivateRoute role='agent'>
                    <AgentNoti />
                </PrivateRoute>
            }
            />
            <Route path='/agent/performance' element={
                <PrivateRoute role='agent'>
                    <AgentPerf />
                </PrivateRoute>
            }
            />
            <Route path='/agent/help' element={
                <PrivateRoute role='agent'>
                    <Agenthelp />
                </PrivateRoute>
            }
            />
            <Route path='/agent/agenttickets/:id' element={
                <PrivateRoute role='agent'>
                    <AgentTicketView />
                </PrivateRoute>
            } />

            <Route path="/reset-pwd/:token" element={<ResetPwd/>}/> 
            <Route path="/agent/accept-invite/:token" element={<AcceptInvite />} />

            {/* Manager Routes */}
            <Route path="/manager" element={<ManagerLogin />} />
            <Route path="/manager/dashboard" element={
                <PrivateRoute role='manager'>
                    <ManagerDashboard />
                </PrivateRoute>
            } />
            <Route path="/manager/agents" element={
                <PrivateRoute role='manager'>
                    <AgentRoster />
                </PrivateRoute>
            } />
            <Route path="/manager/agents/:id" element={
                <PrivateRoute role='manager'>
                    <ManagerAgentDetail />
                </PrivateRoute>
            } />
            <Route path="/manager/tickets" element={
                <PrivateRoute role='manager'>
                    <ManagerAllTickets />
                </PrivateRoute>
            } />
            <Route path="/manager/tickets/:id" element={
                <PrivateRoute role='manager'>
                    <ManagerTicketView />
                </PrivateRoute>
            } />
            <Route path="/manager/escalations" element={
                <PrivateRoute role='manager'>
                    <EscalationQueue />
                </PrivateRoute>
            } />

            <Route path="/unauth" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}
export default App;